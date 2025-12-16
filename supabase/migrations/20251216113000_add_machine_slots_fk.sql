-- Add foreign key from machine_slots.product_u_id to products.product_u_id
-- This enables PostgREST to recognize the relationship for joins

ALTER TABLE machine_slots
  ADD CONSTRAINT machine_slots_product_u_id_fkey
  FOREIGN KEY (product_u_id)
  REFERENCES products(product_u_id)
  ON DELETE SET NULL;
