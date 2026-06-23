"""
Daspowear — FastAPI backend.

Endpoints:
  GET    /api/products            — list all products
  GET    /api/products/{id}       — single product
  POST   /api/products            — create product (admin; demo)
  POST   /api/orders              — create order + initiate YooKassa payment
  GET    /api/orders/{order_uid}  — fetch order status
  POST   /api/webhook/yookassa    — webhook for YooKassa notifications
"""
import os
import uuid
import logging
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db, SessionLocal
from models import Product, Order, OrderItem
from schemas import (
    ProductOut,
    ProductCreate,
    OrderCreate,
    OrderOut,
    PaymentResponse,
)
from payments import create_payment, get_payment_status
from seed import seed as run_seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("daspowear")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize DB and seed first product if empty."""
    init_db()
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            log.info("Database is empty — seeding initial products.")
            db.close()
            run_seed()
        else:
            db.close()
    except Exception as e:
        log.error(f"Startup seed failed: {e}")
    yield

app = FastAPI(
    title="Daspowear API",
    description="Backend for the Daspowear luxury fashion store.",
    version="1.0.0",
    lifespan=lifespan,
)

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "null",
]

extra = os.getenv("ALLOWED_ORIGINS", "")
if extra:
    default_origins.extend([o.strip() for o in extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/products", response_model=List[ProductOut], tags=["products"])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.featured.desc(), Product.created_at.desc()).all()

@app.get("/api/products/{product_id}", response_model=ProductOut, tags=["products"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products", response_model=ProductOut, status_code=201, tags=["products"])
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    """Admin endpoint (no auth here — for demo only)."""
    if db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=409, detail="SKU already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@app.post("/api/orders", response_model=PaymentResponse, status_code=201, tags=["orders"])
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    """
    Create an order, calculate total, initiate a YooKassa payment,
    and return the confirmation URL the client should redirect to.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")


    total = 0.0
    db_items: List[OrderItem] = []
    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if not product.in_stock:
            raise HTTPException(status_code=409, detail=f"Product {product.name} is out of stock")
        if item.size and product.sizes and item.size not in product.sizes:
            raise HTTPException(
                status_code=400,
                detail=f"Size {item.size} not available for {product.name}",
            )

        line_total = product.price * item.quantity
        total += line_total

        db_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                size=item.size,
                quantity=item.quantity,
                unit_price=product.price,
            )
        )

    order_uid = uuid.uuid4().hex
    order = Order(
        order_uid=order_uid,
        amount=total,
        currency="RUB",
        customer_email=payload.customer_email,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
        items=db_items,
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)


    try:
        description = f"Daspowear order #{order_uid[:8]}"
        receipt_items = [
            {
                "name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in db_items
        ]
        payment = create_payment(
            amount=total,
            currency="RUB",
            description=description,
            order_uid=order_uid,
            customer_email=payload.customer_email,
            items=receipt_items,
        )
    except Exception as e:
        log.exception("Failed to create YooKassa payment")
        order.status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Payment provider error: {e}")

    order.payment_id = payment["payment_id"]
    db.commit()

    return PaymentResponse(
        order_uid=order_uid,
        payment_id=payment["payment_id"],
        confirmation_url=payment["confirmation_url"],
        amount=payment["amount"],
        currency=payment["currency"],
        status=payment["status"],
    )

@app.get("/api/orders/{order_uid}", response_model=OrderOut, tags=["orders"])
def get_order(order_uid: str, db: Session = Depends(get_db)):
    """
    Fetch an order. If the order is still pending, also re-check
    YooKassa for an up-to-date payment status (useful on the
    success page when the webhook hasn't fired yet).
    """
    order = db.query(Order).filter(Order.order_uid == order_uid).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == "pending" and order.payment_id:
        try:
            current_status = get_payment_status(order.payment_id)
            if current_status in ("succeeded", "canceled") and current_status != order.status:
                order.status = current_status
                db.commit()
                db.refresh(order)
        except Exception as e:
            log.warning(f"Could not refresh payment status: {e}")

    return order

@app.post("/api/webhook/yookassa", tags=["payments"])
async def yookassa_webhook(request: Request, db: Session = Depends(get_db)):
    """
    YooKassa sends notifications here (payment.succeeded, payment.canceled, ...).
    Configure the URL in YooKassa dashboard:
      https://your-public-domain.tld/api/webhook/yookassa

    For local development, expose this with ngrok or similar.
    """
    body = await request.json()
    event = body.get("event")
    obj = body.get("object", {})
    payment_id = obj.get("id")
    metadata = obj.get("metadata", {}) or {}
    order_uid = metadata.get("order_uid")

    log.info(f"Webhook received: event={event} payment_id={payment_id} order_uid={order_uid}")

    if not payment_id:
        raise HTTPException(status_code=400, detail="Missing payment id")

    order = None
    if order_uid:
        order = db.query(Order).filter(Order.order_uid == order_uid).first()
    if not order:
        order = db.query(Order).filter(Order.payment_id == payment_id).first()
    if not order:
        log.warning(f"Webhook for unknown order (payment_id={payment_id})")
        return {"ok": True}

    if event == "payment.succeeded":
        order.status = "succeeded"
    elif event == "payment.canceled":
        order.status = "canceled"
    elif event == "payment.waiting_for_capture":
        order.status = "waiting_for_capture"

    db.commit()
    return {"ok": True}

@app.get("/api", tags=["health"])
def api_root():
    return {
        "service": "Daspowear API",
        "version": "1.0.0",
        "docs": "/docs",
    }

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_here = Path(__file__).resolve().parent
_frontend_candidates = [
    _here.parent / "frontend",
    _here / "frontend",
    Path.cwd() / "frontend",
]
FRONTEND_DIR = next((p for p in _frontend_candidates if p.is_dir()), None)

if FRONTEND_DIR:
    log.info(f"Serving frontend from {FRONTEND_DIR}")

    app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
    if (FRONTEND_DIR / "images").is_dir():
        app.mount("/images", StaticFiles(directory=FRONTEND_DIR / "images"), name="images")

    @app.get("/", include_in_schema=False)
    def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{page}.html", include_in_schema=False)
    def serve_html_page(page: str):
        candidate = FRONTEND_DIR / f"{page}.html"
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIR / "index.html")



    @app.get("/{filename:path}", include_in_schema=False)
    def serve_root_file(filename: str):

        if "/" in filename or ".." in filename:
            return FileResponse(FRONTEND_DIR / "index.html")
        candidate = FRONTEND_DIR / filename
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIR / "index.html")
else:
    log.warning("Frontend directory not found — serving API only.")
