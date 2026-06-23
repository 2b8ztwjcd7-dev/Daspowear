"""
Pydantic schemas (request/response DTOs).
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class ProductBase(BaseModel):
    sku: str
    name: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    price: float
    currency: str = "RUB"
    category: Optional[str] = None
    images: List[str] = []
    sizes: List[str] = []
    materials: Optional[str] = None
    care: Optional[str] = None
    in_stock: bool = True
    featured: bool = False

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OrderItemIn(BaseModel):
    product_id: int
    size: Optional[str] = None
    quantity: int = Field(default=1, ge=1, le=20)

class OrderCreate(BaseModel):
    customer_email: EmailStr
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    items: List[OrderItemIn]

class OrderItemOut(BaseModel):
    product_id: int
    product_name: str
    size: Optional[str]
    quantity: int
    unit_price: float
    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: int
    order_uid: str
    status: str
    amount: float
    currency: str
    items: List[OrderItemOut]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(BaseModel):
    order_uid: str
    payment_id: str
    confirmation_url: str
    amount: float
    currency: str
    status: str
