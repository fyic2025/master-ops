# Buy Organics Online - Database Discovery Report

**Date:** 2025-11-22
**Database Instance:** newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com

---

## Database: c7c7buyorgdnxtl1

### Table Summary (sorted by row count)

| Table Name | Rows | Columns |
|------------|------|--------|
| w_checked_barcodes_group | 29,442 | 6 |
| w_reference_supplier | 21,684 | 7 |
| supplier_5f60cbb9e9dc5 | 16,735 | 18 |
| w_register_prod_orders | 15,993 | 13 |
| w_link_to_feed | 14,374 | 10 |
| w_live_link_prod | 13,512 | 7 |
| w_live_link_prod_group | 12,515 | 6 |
| wp_prods_check | 12,242 | 32 |
| w_temp_newprods | 10,287 | 6 |
| product_supplier | 8,061 | 9 |
| w_register_orders | 7,750 | 12 |
| supplier_5f60e3088f652 | 5,472 | 37 |
| w_temp_prod_orders | 4,268 | 7 |
| w_product_suppliers | 3,565 | 12 |
| w_attributes_value | 3,250 | 4 |
| supplier_5f60ac25ed34e | 3,245 | 19 |
| w_custom_product_data | 1,378 | 9 |
| supplier_5f60c4e0c0a1a_backup | 1,375 | 20 |
| w_product_suppliers_group | 1,360 | 5 |
| w_all_brands | 1,303 | 3 |
| supplier_5f60c4e0c0a1a | 1,235 | 20 |
| w_temp_newprods_backup | 1,122 | 6 |
| w_reference_supplier_kadac_backup | 1,063 | 5 |
| w_removed_live_products | 976 | 4 |
| w_linked_products | 534 | 5 |
| supplier_5f60f3f78ba75 | 308 | 24 |
| w_temp_client_order_grouping | 287 | 5 |
| feeds_unwanted | 247 | 4 |
| currency | 181 | 3 |
| supplier_5f60f84d103c7 | 97 | 19 |
| supplier_5fbd02db9b5a6 | 81 | 17 |
| sessions | 76 | 6 |
| override_weight | 69 | 3 |
| w_brand_groups_checked | 60 | 3 |
| attributes_pivot | 29 | 4 |
| stock | 27 | 8 |
| supplier_5f61f5100c4f0 | 22 | 15 |
| entries | 19 | 9 |
| w_unlinked_from_feed | 18 | 7 |
| suppliers | 17 | 7 |
| warehouses | 17 | 6 |
| password_resets | 11 | 3 |
| entries_invoice | 9 | 7 |
| feeds | 9 | 21 |
| w_alert_register_to_update | 9 | 7 |
| matching_fields | 8 | 5 |
| attributes_val | 6 | 3 |
| categories | 5 | 10 |
| orders | 5 | 9 |
| uploaded_images | 5 | 8 |
| channels | 4 | 6 |
| migrations | 4 | 3 |
| w_group_discount | 4 | 6 |
| w_purchase_rules | 4 | 5 |
| attributes | 3 | 2 |
| ebays | 3 | 12 |
| override_price | 3 | 4 |
| users_backup | 3 | 7 |
| usersroles | 3 | 2 |
| w_attributes | 3 | 2 |
| bcs | 2 | 9 |
| optimum_stock | 2 | 5 |
| users | 2 | 7 |
| w_live_saleprice_variants | 2 | 7 |
| w_stock_groups | 2 | 11 |
| seo_comments | 1 | 6 |
| templates | 1 | 5 |
| user_role | 1 | 2 |
| w_order_supplier | 1 | 6 |
| w_purchase_orders | 1 | 13 |
| w_virtual_inventory | 1 | 11 |
| products | 0 | 9 |
| sub_category | 0 | 8 |
| supplier_custom | 0 | 8 |
| user_permission | 0 | 2 |
| userspermissions | 0 | 2 |
| w_live_sync | 0 | 3 |
| w_partial_sync_report | 0 | 10 |


---

## Key Tables - Detailed Structure

### w_checked_barcodes_group

**Rows:** 29,442  
**Columns:** 6

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| uniqcode | varchar(254) | YES |  |  |  |
| barcode | varchar(254) | NO | MUL |  |  |
| size | varchar(254) | NO |  |  |  |
| created_at | datetime | NO |  |  |  |
| updated_at | datetime | NO |  |  |  |

### w_reference_supplier

**Rows:** 21,684  
**Columns:** 7

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| sku | varchar(50) | YES |  |  |  |
| importrules | varchar(14) | NO |  | NEW |  |
| rule | varchar(140) | YES |  |  |  |
| calculations | enum('y','n') | NO |  | n |  |
| supplier_shortcode | varchar(14) | YES |  |  |  |
| move_to_delete | enum('y','n') | NO |  | n |  |

### supplier_5f60cbb9e9dc5

**Rows:** 16,735  
**Columns:** 18

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| brand | varchar(254) | YES | MUL |  |  |
| name | varchar(254) | NO | PRI |  |  |
| display_name | text | YES |  |  |  |
| ws_ex_gst | text | YES |  |  |  |
| rrp | text | YES |  |  |  |
| gst_status | text | YES |  |  |  |
| availability | text | YES |  |  |  |
| to_be_discontinued | text | YES |  |  |  |
| barcode | text | YES |  |  |  |
| prod_live_id | int | NO | MUL |  |  |
| size | varchar(254) | NO |  |  |  |
| editsize | varchar(254) | YES |  |  |  |
| editweight | varchar(5) | NO |  | 0 |  |
| editpercarton | varchar(254) | NO |  |  |  |
| editcartononly | varchar(254) | NO |  |  |  |
| found_on_feeds | text | YES |  |  |  |
| active_on_feeds | text | YES |  |  |  |
| available_on_feeds | text | NO |  |  |  |

### w_register_prod_orders

**Rows:** 15,993  
**Columns:** 13

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| prod_id | int | NO |  |  |  |
| quantity | int | NO |  |  |  |
| base_price | double | NO |  |  |  |
| cost_price | double | NO |  |  |  |
| total_ex_tax | decimal(10,2) | NO |  |  |  |
| total_inc_tax | decimal(10,2) | NO |  |  |  |
| refunded | decimal(10,2) | NO |  |  |  |
| store_order_id | int | NO |  |  |  |
| prod_name | varchar(256) | NO |  |  |  |
| prod_sku | varchar(256) | NO |  |  |  |
| date | date | NO |  |  |  |
| total_cost_price | double | NO |  |  |  |

### w_link_to_feed

**Rows:** 14,374  
**Columns:** 10

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| prod_id | int | NO |  |  |  |
| uniqcode | varchar(254) | YES | MUL |  |  |
| feed_id | int | NO | MUL |  |  |
| barcode_feed | varchar(254) | NO |  |  |  |
| sku_feed | varchar(254) | NO | MUL |  |  |
| brand_feed | varchar(254) | NO |  |  |  |
| size_feed | varchar(254) | NO |  |  |  |
| created_at | datetime | NO |  |  |  |
| updated_at | datetime | NO |  |  |  |

### w_live_link_prod

**Rows:** 13,512  
**Columns:** 7

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| group_id | int | NO | MUL |  |  |
| prod_id | int | NO | MUL |  |  |
| size | varchar(254) | NO |  |  |  |
| brand | varchar(254) | NO |  |  |  |
| barcode_upc | varchar(254) | NO |  |  |  |
| sku | varchar(254) | NO |  |  |  |

### w_live_link_prod_group

**Rows:** 12,515  
**Columns:** 6

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| uniqcode | varchar(254) | YES |  |  |  |
| name | varchar(254) | NO |  |  |  |
| barc_str | text | NO |  |  |  |
| size_str | text | NO |  |  |  |
| brand_str | text | NO |  |  |  |

### wp_prods_check

**Rows:** 12,242  
**Columns:** 32

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| id_prod | int | NO | MUL |  |  |
| name | varchar(255) | NO |  |  |  |
| barcode_gtin | varchar(256) | NO |  |  |  |
| barcode_feed | varchar(254) | NO | MUL |  |  |
| barcode_upc | varchar(254) | NO |  |  |  |
| desc_count | int | NO |  |  |  |
| is_visible | varchar(10) | NO |  |  |  |
| can_be_purchased | varchar(5) | YES |  |  |  |
| inventory_level | int | YES |  |  |  |
| url | varchar(254) | NO |  |  |  |
| disabled | varchar(5) | NO |  | false |  |
| to_delete | varchar(5) | NO |  | false |  |
| updatable_by_sync | varchar(5) | NO |  | false |  |
| sku | varchar(254) | NO | MUL |  |  |
| weight | varchar(10) | NO |  | 0 |  |
| feed_size | varchar(254) | NO |  |  |  |
| feed_brand | varchar(254) | NO | MUL |  |  |
| live_price | double(10,2) | NO |  |  |  |
| live_retail_price | double(10,2) | NO |  |  |  |
| live_sale_price | double(10,2) | NO |  |  |  |
| live_cost_price | double(10,2) | NO |  |  |  |
| feed_rrp | double(10,2) | NO |  |  |  |
| feed_wholesale | double(10,2) | NO |  |  |  |
| margin | double(10,2) | NO |  |  |  |
| feed | varchar(254) | NO |  |  |  |
| feedid | int | YES |  |  |  |
| status | varchar(256) | NO |  |  |  |
| categories | text | NO |  |  |  |
| statusSKU | varchar(254) | NO |  |  |  |
| created_at | datetime | NO |  |  |  |
| updated_at | datetime | NO |  |  |  |

### w_temp_newprods

**Rows:** 10,287  
**Columns:** 6

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| feedid | int | NO |  |  |  |
| sku | varchar(254) | NO | MUL |  |  |
| categories | text | NO |  |  |  |
| flag | varchar(5) | NO |  | false |  |
| created_at | datetime | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### product_supplier

**Rows:** 8,061  
**Columns:** 9

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| sku_intern | varchar(10) | YES | MUL |  |  |
| supplier_sku | varchar(24) | NO | MUL |  |  |
| ref_table | varchar(128) | NO |  |  |  |
| id | int | NO | PRI |  | auto_increment |
| category_id | varchar(100) | YES |  |  |  |
| subcategory_id | int | YES |  |  |  |
| id_composed | varchar(255) | YES |  |  |  |
| priority | int | NO |  | 1 |  |
| archive | int | NO |  | 0 |  |

### w_register_orders

**Rows:** 7,750  
**Columns:** 12

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| order_id | int | NO |  |  |  |
| subtotal_ex_tax | decimal(10,2) | NO |  |  |  |
| subtotal_inc_tax | decimal(10,2) | NO |  |  |  |
| order_status | varchar(256) | NO |  |  |  |
| shipping_cost_inc_tax | double | NO |  |  |  |
| discount | double | NO |  |  |  |
| total_cost_price | decimal(10,2) | NO |  |  |  |
| items_total | decimal(10,2) | NO |  |  |  |
| refunded | decimal(10,2) | NO |  | 0.00 |  |
| hours_diff_created_shipped | decimal(10,2) | NO |  |  |  |
| date | date | NO |  |  |  |

### supplier_5f60e3088f652

**Rows:** 5,472  
**Columns:** 37

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| sku | varchar(254) | NO | PRI |  |  |
| brand | varchar(254) | YES | MUL |  |  |
| description | text | YES |  |  |  |
| size | text | YES |  |  |  |
| rrp | text | YES |  |  |  |
| tax | text | YES |  |  |  |
| price | text | YES |  |  |  |
| percarton | text | YES |  |  |  |
| barcode | text | YES |  |  |  |
| isactive | text | YES |  |  |  |
| imageurl | text | YES |  |  |  |
| certified_organic | text | YES |  |  |  |
| organic_ingredients | text | YES |  |  |  |
| gluten_free | text | YES |  |  |  |
| dairy_free | text | YES |  |  |  |
| vegetarian | text | YES |  |  |  |
| vegan_friendly | text | YES |  |  |  |
| sulphate_free | text | YES |  |  |  |
| fairtrade | text | YES |  |  |  |
| ingredients | text | NO |  |  |  |
| new_product | text | YES |  |  |  |
| deals | text | YES |  |  |  |
| deactivated | text | YES |  |  |  |
| in_stock | text | YES |  |  |  |
| prod_live_id | int | NO | MUL |  |  |
| editsize | varchar(254) | NO |  |  |  |
| editweight | varchar(5) | NO |  | 0 |  |
| editpercarton | varchar(254) | NO |  |  |  |
| editcartononly | varchar(254) | NO |  |  |  |
| found_on_feeds | text | YES |  |  |  |
| active_on_feeds | text | YES |  |  |  |
| available_on_feeds | text | NO |  |  |  |
| length_mm | text | YES |  |  |  |
| width_mm | text | YES |  |  |  |
| height_mm | text | YES |  |  |  |
| weight_kg | text | YES |  |  |  |
| retail_unit_barcode | text | YES |  |  |  |

### w_temp_prod_orders

**Rows:** 4,268  
**Columns:** 7

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| prod_id | int | NO | MUL |  |  |
| last_7 | int | NO |  |  |  |
| last_month | int | NO |  |  |  |
| last_3_months | int | NO |  |  |  |
| last_6_months | int | NO |  |  |  |
| last_12_months | int | NO |  |  |  |

### w_product_suppliers

**Rows:** 3,565  
**Columns:** 12

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| group_id | int | NO |  |  |  |
| barcode | varchar(256) | NO |  |  |  |
| priority | int | NO |  |  |  |
| prod_name | varchar(256) | NO |  |  |  |
| prod_id | int | NO |  |  |  |
| sku_feed | varchar(256) | NO |  |  |  |
| provider_id | int | NO |  |  |  |
| admin_edit | varchar(256) | NO |  | false |  |
| create_date | datetime | NO |  |  |  |
| updated_at | datetime | NO |  |  |  |
| created_at | datetime | NO |  |  |  |

### w_attributes_value

**Rows:** 3,250  
**Columns:** 4

**Schema:**

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int | NO | PRI |  | auto_increment |
| type | int | NO | MUL |  |  |
| initval | varchar(254) | NO | MUL |  |  |
| newval | varchar(254) | NO |  |  |  |

---

## Supplier/Vendor Analysis

Found supplier-related tables:

- **w_reference_supplier**: 21684 rows
- **supplier_5f60cbb9e9dc5**: 16735 rows
- **product_supplier**: 8061 rows
- **supplier_5f60e3088f652**: 5472 rows
- **w_product_suppliers**: 3565 rows
- **supplier_5f60ac25ed34e**: 3245 rows
- **supplier_5f60c4e0c0a1a_backup**: 1375 rows
- **w_product_suppliers_group**: 1360 rows
- **supplier_5f60c4e0c0a1a**: 1235 rows
- **w_reference_supplier_kadac_backup**: 1063 rows
- **supplier_5f60f3f78ba75**: 308 rows
- **supplier_5f60f84d103c7**: 97 rows
- **supplier_5fbd02db9b5a6**: 81 rows
- **supplier_5f61f5100c4f0**: 22 rows
- **suppliers**: 17 rows
- **w_order_supplier**: 1 rows
- **supplier_custom**: 0 rows
