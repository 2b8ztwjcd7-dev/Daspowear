"""
YooKassa sandbox integration with fiscal receipt (54-ФЗ).

Docs:
  https://yookassa.ru/developers/api
  https://yookassa.ru/developers/payment-acceptance/receipts/54fz/basics
"""
import os
import uuid
from typing import Dict, Any, List
from dotenv import load_dotenv
from yookassa import Configuration, Payment

load_dotenv()

SHOP_ID = os.getenv("YOOKASSA_SHOP_ID")
SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY")
RETURN_URL = os.getenv("RETURN_URL", "http://localhost:5173/success.html")

if not SHOP_ID or not SECRET_KEY:
    raise RuntimeError("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY must be set in .env")

Configuration.account_id = SHOP_ID
Configuration.secret_key = SECRET_KEY

def create_payment(
    amount: float,
    currency: str,
    description: str,
    order_uid: str,
    customer_email: str,
    items: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Create a YooKassa payment + attach a fiscal receipt (54-ФЗ).

    items must look like:
        [
            {"name": "Vinyl Maxi Skirt", "quantity": 1, "unit_price": 15000.0},
            ...
        ]

    The receipt object tells YooKassa to send a fiscal cheque to the buyer's
    email after the payment succeeds. For sandbox we use a "test" tax system
    code and VAT code 1 (NDS not subject) — fine for testing/exam purposes.
    """
    idempotence_key = str(uuid.uuid4())


    receipt_items = []
    for it in items:
        receipt_items.append({
            "description": it["name"][:128],
            "quantity": str(it["quantity"]),
            "amount": {
                "value": f"{float(it['unit_price']):.2f}",
                "currency": currency,
            },

            "vat_code": 1,

            "payment_mode": "full_prepayment",

            "payment_subject": "commodity",
        })

    payment = Payment.create(
        {
            "amount": {
                "value": f"{amount:.2f}",
                "currency": currency,
            },
            "confirmation": {
                "type": "redirect",
                "return_url": f"{RETURN_URL}?order={order_uid}",
            },
            "capture": True,
            "description": description,
            "metadata": {
                "order_uid": order_uid,
            },

            "receipt": {
                "customer": {
                    "email": customer_email,
                },
                "items": receipt_items,
            },
        },
        idempotence_key,
    )

    return {
        "payment_id": payment.id,
        "status": payment.status,
        "confirmation_url": payment.confirmation.confirmation_url,
        "amount": float(payment.amount.value),
        "currency": payment.amount.currency,
    }

def get_payment_status(payment_id: str) -> str:
    """Fetch current status of a payment from YooKassa."""
    payment = Payment.find_one(payment_id)
    return payment.status
