"""
Seed the database with initial products.

This is the SINGLE PLACE you edit to change the catalogue.
Add a new dict to SEED_PRODUCTS and run:  python seed.py
"""
from database import SessionLocal, init_db
from models import Product

SEED_PRODUCTS = [
    {
        "sku": "DSP-SK-001",
        "name": "VINYL MAXI SKIRT",
        "subtitle": "Glossy vinyl pencil skirt with back slit",
        "description": (
            "A floor-length pencil skirt cut from a high-shine coated vinyl. "
            "Hugs the silhouette, falls in long vertical lines and breaks into "
            "a deep back slit for movement. Hand-finished seams, hidden zip, "
            "lined interior. A single, considered object — wear it as the "
            "centerpiece of the look."
        ),
        "price": 15000.00,
        "currency": "RUB",
        "category": "skirts",

        "images": [
            "/images/skirt-01-hanger.jpg",
            "/images/skirt-02-side.jpg",
            "/images/skirt-04-back.jpg",
            "/images/skirt-05-detail.jpg",
            "/images/skirt-03-pose.jpg",
            "/images/skirt-06-floor.jpg",
        ],
        "sizes": ["XS", "S", "M", "L"],
        "materials": "Coated vinyl outer. Viscose lining. Concealed metal zip.",
        "care": "Wipe clean with a soft damp cloth. Do not wash. Do not iron. Store flat or on a wide hanger, away from direct sunlight.",
        "in_stock": True,
        "featured": True,
    },
]

def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        for data in SEED_PRODUCTS:
            existing = db.query(Product).filter(Product.sku == data["sku"]).first()
            if existing:

                for k, v in data.items():
                    setattr(existing, k, v)
                print(f"  updated {data['sku']} — {data['name']}")
            else:
                product = Product(**data)
                db.add(product)
                print(f"  added   {data['sku']} — {data['name']}")
        db.commit()
        print("Seed complete.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
