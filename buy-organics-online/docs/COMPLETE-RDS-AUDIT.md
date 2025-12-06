# COMPLETE AWS RDS INFRASTRUCTURE AUDIT

**Date:** 2025-11-22
**Auditor:** Claude AI

---

# RDS INSTANCE: newsync6

**Endpoint:** newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com

**User Databases:** 3

## Database: c7c7buyorgdnxtl1

**Tables:** 78

| Table | Rows | Key Columns |
|-------|------|------------|
| attributes | 3 | id |
| attributes_pivot | 29 | id |
| attributes_val | 6 | id |
| bcs | 2 | id |
| categories | 5 | id |
| channels | 4 | id |
| currency | 181 | - |
| ebays | 3 | id |
| entries | 19 | id |
| entries_invoice | 9 | id |
| feeds | 9 | id |
| feeds_unwanted | 247 | id, feedid |
| matching_fields | 8 | name |
| migrations | 4 | id |
| optimum_stock | 2 | id |
| orders | 5 | id |
| override_price | 3 | id |
| override_weight | 69 | id |
| password_resets | 11 | - |
| product_supplier | 8,061 | sku_intern, supplier_sku, id |
| products | 0 | id |
| seo_comments | 1 | id |
| sessions | 76 | id |
| stock | 27 | id |
| sub_category | 0 | id |
| supplier_5f60ac25ed34e | 3,245 | item_code, brand, prod_live_id |
| supplier_5f60c4e0c0a1a | 1,235 | sku, brand, prod_live_id |
| supplier_5f60c4e0c0a1a_backup | 1,375 | sku, brand, prod_live_id |
| supplier_5f60cbb9e9dc5 | 16,735 | brand, name, prod_live_id |
| supplier_5f60e3088f652 | 5,472 | sku, brand, prod_live_id |
| supplier_5f60f3f78ba75 | 308 | dbid, brand |
| supplier_5f60f84d103c7 | 97 | sku, brand_name, prod_live_id |
| supplier_5f61f5100c4f0 | 22 | assignee, sku, prod_live_id |
| supplier_5fbd02db9b5a6 | 81 | sku, brand, prod_live_id |
| supplier_custom | 0 | id |
| suppliers | 17 | id |
| templates | 1 | id |
| uploaded_images | 5 | id |
| user_permission | 0 | - |
| user_role | 1 | user_id, role_id |
| users | 2 | id |
| users_backup | 3 | id |
| userspermissions | 0 | id |
| usersroles | 3 | id |
| w_alert_register_to_update | 9 | id |
| w_all_brands | 1,303 | id, br_id |
| w_attributes | 3 | id |
| w_attributes_value | 3,250 | id, type, initval |
| w_brand_groups_checked | 60 | id, brand |
| w_checked_barcodes_group | 29,442 | id, barcode |
| w_custom_product_data | 1,378 | id, prod_id |
| w_group_discount | 4 | id |
| w_link_to_feed | 14,374 | id, uniqcode, feed_id, sku_feed |
| w_linked_products | 534 | id |
| w_live_link_prod | 13,512 | id, group_id, prod_id |
| w_live_link_prod_group | 12,515 | id |
| w_live_saleprice_variants | 2 | id, prod_id |
| w_live_sync | 0 | id |
| w_order_supplier | 1 | id |
| w_partial_sync_report | 0 | id, prod_id |
| w_product_suppliers | 3,565 | id |
| w_product_suppliers_group | 1,360 | id |
| w_purchase_orders | 1 | id |
| w_purchase_rules | 4 | id, type |
| w_reference_supplier | 21,684 | id |
| w_reference_supplier_kadac_backup | 1,063 | id |
| w_register_orders | 7,750 | id |
| w_register_prod_orders | 15,993 | id |
| w_removed_live_products | 976 | id |
| w_stock_groups | 2 | id |
| w_temp_client_order_grouping | 287 | id |
| w_temp_newprods | 10,287 | id, sku |
| w_temp_newprods_backup | 1,122 | id, sku |
| w_temp_prod_orders | 4,268 | id, prod_id |
| w_unlinked_from_feed | 18 | id, prod_id |
| w_virtual_inventory | 1 | id |
| warehouses | 17 | id |
| wp_prods_check | 12,242 | id, id_prod, barcode_feed, sku, feed_brand |

## Database: dracah

**Tables:** 1

| Table | Rows | Key Columns |
|-------|------|------------|
| google_oauth | 1 | id |

## Database: new_fyic_db

**Tables:** 25

| Table | Rows | Key Columns |
|-------|------|------------|
| admin | 9 | id |
| bc_ai_score | 10,347 | product_id |
| bc_blog_improved_ai_score | 1 | id |
| bc_cat_improved_ai_score | 668 | id |
| bc_improved_ai_score | 5,247 | product_id |
| bc_orders | 157,126 | id |
| bc_products | 11,357 | id |
| crons | 1,037 | id |
| gbn_improved_ai_score | 0 | sku |
| globalnature_products | 0 | id |
| kad_improved_ai_score | 1 | sku |
| kadac_products | 945 | id |
| kik_improved_ai_score | 2 | sku |
| kik_products | 424 | id |
| klaviyo_profiles | 36,938 | id |
| ob_improved_ai_score | 9 | sku |
| oborne_products | 8,570 | id |
| oborne_stocks | 3,430,395 | id |
| sessions | 9 | session_id |
| settings | 4 | id |
| shopify_orders | 30,535 | id |
| teelixir_stock_on_hand | 266 | id |
| uhp_improved_ai_score | 1,787 | sku |
| uhp_products | 4,501 | id |
| vapi_webhook | 1 | id |

### 🔍 CRONS Table (Sync Logs)

**Columns:** id, name, date_time, url

**Recent executions:**
```json
[
  {
    "id": 1037,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T14:45:45.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763783144941.json"
  },
  {
    "id": 1036,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T14:02:40.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763780560826.json"
  },
  {
    "id": 1035,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T12:45:46.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763775946196.json"
  },
  {
    "id": 1034,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T12:02:52.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763773372540.json"
  },
  {
    "id": 1033,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T10:45:43.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763768743091.json"
  },
  {
    "id": 1032,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T10:02:38.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763766158615.json"
  },
  {
    "id": 1031,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T08:45:43.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763761543054.json"
  },
  {
    "id": 1030,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T08:02:38.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763758958159.json"
  },
  {
    "id": 1029,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T06:45:46.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763754346337.json"
  },
  {
    "id": 1028,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T06:04:21.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763751861440.json"
  },
  {
    "id": 1027,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T04:45:45.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763747145524.json"
  },
  {
    "id": 1026,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T04:02:39.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763744559391.json"
  },
  {
    "id": 1025,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T02:45:44.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763739944452.json"
  },
  {
    "id": 1024,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T02:02:56.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763737376289.json"
  },
  {
    "id": 1023,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T00:45:48.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763732748601.json"
  },
  {
    "id": 1022,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-22T00:02:46.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763730166016.json"
  },
  {
    "id": 1021,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-21T22:45:44.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763725544415.json"
  },
  {
    "id": 1020,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-21T22:02:40.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763722960607.json"
  },
  {
    "id": 1019,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-21T20:45:44.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763718344528.json"
  },
  {
    "id": 1018,
    "name": "BOO daily availability cron",
    "date_time": "2025-11-21T20:02:45.000Z",
    "url": "https://fyic-log.s3.ap-southeast-2.amazonaws.com/1763715765338.json"
  }
]
```

### 📦 BC_PRODUCTS Table

[
  {
    "total": 11357,
    "unique_skus": 11357
  }
]

**Sample:**
```json
[
  {
    "id": 1,
    "product_id": 300,
    "name": "Biologika Lavender Hand Wash 250ml",
    "type": "physical",
    "sku": "KIK - ORG54",
    "weight": 0.45,
    "width": 0,
    "depth": 0,
    "height": 0,
    "price": 8.5,
    "cost_price": 3.75,
    "retail_price": 0,
    "sale_price": 6.95,
    "map_price": 0,
    "tax_class_id": 0,
    "product_tax_code": "",
    "calculated_price": 6.95,
    "categories": [
      438,
      1301
    ],
    "brand_id": 697,
    "option_set_id": 6,
    "option_set_display": "right",
    "inventory_level": 0,
    "inventory_warning_level": 0,
    "inventory_tracking": "product",
    "reviews_rating_sum": 0,
    "reviews_count": 0,
    "total_sold": 83,
    "fixed_cost_shipping_price": 0,
    "is_free_shipping": 0,
    "is_visible": 1,
    "is_featured": 0,
    "related_products": "[-1]",
    "warranty": "",
    "bin_picking_number": "",
    "layout_file": "product.html",
    "upc": "9321582004332",
    "mpn": "",
    "gtin": "9321582004332",
    "search_keywords": "",
    "availability": "available",
    "availability_description": "",
    "gift_wrapping_options_type": "any",
    "gift_wrapping_options_list": [],
    "sort_order": 0,
    "_condition": "New",
    "is_condition_shown": 0,
    "order_quantity_minimum": 0,
    "order_quantity_maximum": 0,
    "page_title": "Lavender Hand & Body Wash 250ml |",
    "meta_keywords": [
      "Australian Biologika Lavender Organic Hand & Body Wash"
    ],
    "meta_description": "Looking for Biologika Lavender Hand & Body Wash 250ml? Find Biologika and so much more here at. Australia's leading online health store. Try Us!",
    "description": "<h2>Biologika Lavender Hand Wash 250ml</h2>\r\n<p><span>Natural <a href=\"%%GLOBAL_ShopPathSSL%%/hand-and-body-wash/\">hand wash</a> enriched with Organic Aloe Vera, Green Tea and Cucumber Extracts. Enjoy the calming benefits of Lavender essential oil along with a hint of Rosemary. The combination of these herbal extracts will refresh and help remove impurities from the skin. Perfect for everyone to enjoy!</span></p>\r\n<h3>Directions for use:</h3>\r\n<p><span>Apply a small amount directly onto your hands, and/or body or onto a sponge. Gently massage into a lather and rinse.</span></p>\r\n<h3>Contains No:</h3>\r\n<ul>\r\n<li><span>Synthetic fragrances</span></li>\r\n<li><span>Parabens</span></li>\r\n<li><span>artificial colours</span></li>\r\n<li><span>Formaldehyde causing agents</span></li>\r\n<li><span>Animal derived ingredients</span></li>\r\n</ul>\r\n<h3>Ingredients:</h3>\r\n<p><span>Aqua, Coco Glucoside, , Parfum (Natural Preservative), Lavender essential oil, (Lavendula angustifolia) Rosemary essential oil (Rosemaris officinalis), Organic Calendula extract (Calendula officinalis), Organic Chamomile extract (Camomilla recutita), Organic Lavender hydrosol (Lavendula angustifolia) , Citric Acid, Potassium Sorbate.</span></p>",
    "date_created": "2013-10-13T05:36:16.000Z",
    "date_modified": "2025-11-20T06:02:15.000Z",
    "base_variant_id": 339
  },
  {
    "id": 2,
    "product_id": 269,
    "name": "Biologika Lavender Fields Roll On Aco 70ml",
    "type": "physical",
    "sku": "KIK - ORG15-CO",
    "weight": 0.25,
    "width": 0,
    "depth": 0,
    "height": 0,
    "price": 12.95,
    "cost_price": 4.52,
    "retail_price": 0,
    "sale_price": 9.75,
    "map_price": 0,
    "tax_class_id": 0,
    "product_tax_code": "",
    "calculated_price": 9.75,
    "categories": [
      579
    ],
    "brand_id": 697,
    "option_set_id": 6,
    "option_set_display": "right",
    "inventory_level": 8,
    "inventory_warning_level": 0,
    "inventory_tracking": "product",
    "reviews_rating_sum": 0,
    "reviews_count": 0,
    "total_sold": 287,
    "fixed_cost_shipping_price": 0,
    "is_free_shipping": 0,
    "is_visible": 1,
    "is_featured": 0,
    "related_products": "[-1]",
    "warranty": "",
    "bin_picking_number": "",
    "layout_file": "product.html",
    "upc": "9321582004370",
    "mpn": "",
    "gtin": "9321582004370",
    "search_keywords": "",
    "availability": "available",
    "availability_description": "",
    "gift_wrapping_options_type": "any",
    "gift_wrapping_options_list": [],
    "sort_order": 0,
    "_condition": "New",
    "is_condition_shown": 0,
    "order_quantity_minimum": 0,
    "order_quantity_maximum": 0,
    "page_title": "Australian Biologika | Lavender Fields Organic Deodorant 70ml",
    "meta_keywords": [
      "Australian Biologika Lavender Fields Organic Deodorant"
    ],
    "meta_description": "It is a refreshing blend of certified organic herbs, pure essential oils, wild crafted Australian bush flowers and Australian bush fruit extracts.",
    "description": "<h2>Biologika Lavender Fields Roll On Aco 70ml</h2>\r\n<p><span>A Natural antibacterial formula with organic and natural compounds to neutralise and inhibit odor &ndash; causing bacteria. Quickly absorbed and long lasting protection. Certified Organic Ingredients. ALUMINIUM FREE.</span></p>\r\n<h3>Directions for use:</h3>\r\n<p><span>Roll on under arms. Repeat if necessary.</span></p>\r\n<h3>Contains No:</h3>\r\n<ul>\r\n<li><span>Synthetic fragrances</span></li>\r\n<li><span>Parabens</span></li>\r\n<li><span>artificial colours</span></li>\r\n<li><span>Formaldehyde causing agents</span></li>\r\n<li><span>Animal derived ingredients</span></li>\r\n</ul>\r\n<h3>Ingredients:</h3>\r\n<p><span>Organic Aloe Vera (Aloe barbadensis juice)*, Sodium bicarbonate, Aqua, Organic Lavender hydrosol (Lavendula angustifolia)*, Organic Kakadu Plum Extract *, Xanthan gum*, Alcohol*, Parfum (Natural preservative)**, Organic Lavender Essential Oil (Lavendula angustifolia)*, Organic Ylang Ylang Essential oil (Cananga odorata)*, Organic Jojoba Oil (Simmondsia chineses)*, Organic Rosehip Oil (Savannah-Rosa rubiginosa)*, Organic Avocado Oil (Persea gratissima)*<br /> From Organic Agriculture*<br /> Made using Organic Ingredients**<br /> 95% Organic of total<br /> 100% Natural origin of total</span></p>",
    "date_created": "2013-10-13T05:36:15.000Z",
    "date_modified": "2025-09-04T02:02:15.000Z",
    "base_variant_id": 310
  },
  {
    "id": 3,
    "product_id": 313,
    "name": "Biologika Citrus Rose Shampoo 500ml",
    "type": "physical",
    "sku": "KIK - ORG70",
    "weight": 0.85,
    "width": 0,
    "depth": 0,
    "height": 0,
    "price": 13.95,
    "cost_price": 4.88,
    "retail_price": 0,
    "sale_price": 10.95,
    "map_price": 0,
    "tax_class_id": 0,
    "product_tax_code": "",
    "calculated_price": 10.95,
    "categories": [
      1181
    ],
    "brand_id": 697,
    "option_set_id": 6,
    "option_set_display": "right",
    "inventory_level": 25,
    "inventory_warning_level": 0,
    "inventory_tracking": "product",
    "reviews_rating_sum": 0,
    "reviews_count": 0,
    "total_sold": 123,
    "fixed_cost_shipping_price": 0,
    "is_free_shipping": 0,
    "is_visible": 1,
    "is_featured": 0,
    "related_products": "[-1]",
    "warranty": "",
    "bin_picking_number": "",
    "layout_file": "product.html",
    "upc": "9321582004202",
    "mpn": "",
    "gtin": "9321582004202",
    "search_keywords": "",
    "availability": "available",
    "availability_description": "",
    "gift_wrapping_options_type": "any",
    "gift_wrapping_options_list": [],
    "sort_order": 0,
    "_condition": "New",
    "is_condition_shown": 0,
    "order_quantity_minimum": 0,
    "order_quantity_maximum": 0,
    "page_title": "Biologika Citrus Rose Shampoo 500ml | Buy Organics Online",
    "meta_keywords": [],
    "meta_description": "Looking for Biologika Citrus Rose Shampoo 500ml? Find Biologika and so much more here at Buy Organics Online. Australia's leading online health store. Try Us!",
    "description": "<h2>Biologika Citrus Rose Shampoo 500ml</h2>\r\n<p><span><a href=\"%%GLOBAL_ShopPathSSL%%/biologika-shampoo/\">Biologika&rsquo;s Citrus Rose Shampoo</a> will instantly penetrate, gently cleaning and leaving your hair and scalp smooth and replenished.</span></p>\r\n<p><strong>Formulated to strengthen hair, a rich and penetrating shampoo with:</strong></p>\r\n<ul>\r\n<li><span>Organic shea butter &ndash; rich in vitamin A and E, it intensely repairs and helps in retaining elasticity of the hair</span></li>\r\n<li><span>Organic passion flower &ndash; added for its relaxing and balancing properties</span></li>\r\n<li><span>Organic goji berry &ndash; delivers high antioxidant properties</span></li>\r\n</ul>\r\n<p><strong>All Australian Biologika products are:</strong></p>\r\n<ul>\r\n<li><span>All products are made with natural and certified organic Ingredients</span></li>\r\n<li><span>Are free from harsh and synthetic chemicals or artificial fragrances</span></li>\r\n<li><span>Cruelty free &amp; Vegan Friendly</span></li>\r\n<li><span>Grey Water Safe</span></li>\r\n<li><span>Recyclable packaging, all sourced from Australia</span></li>\r\n</ul>\r\n<h3><strong>Contains No:</strong></h3>\r\n<ul>\r\n<li><span>Synthetic fragrances</span></li>\r\n<li><span>Parabens</span></li>\r\n<li><span>artificial colours</span></li>\r\n<li><span>Formaldehyde causing agents</span></li>\r\n<li><span>Animal derived ingredients</span></li>\r\n</ul>\r\n<h3><strong>Ingredients:</strong></h3>\r\n<p><span>Aqua, Guar Hydroxypropyltrimonium Chloride, Coco Glucosides, Rose Geranium Essential Oil (Pelargonium Graveolens) Mandarin Essential Oil (Citrus Reticulata) , Parfum (Natural Preservative), Sunflower Oil (Helianthus Annuus) Organic Olive Leaf Extract ( Olea Europaea) Organic Goji Berry Extract (Lycium Barbarum) Organic Lavender (Lavandula Angustifolia) Citric Acid, Potassium Sorbate</span></p>",
    "date_created": "2013-10-13T05:36:17.000Z",
    "date_modified": "2025-11-21T02:02:24.000Z",
    "base_variant_id": 352
  }
]
```

### 🛒 BC_ORDERS Table

[
  {
    "total_orders": 157126,
    "first_order_id": 1,
    "last_order_id": 157126
  }
]


---

# RDS INSTANCE: newsync5 (older/backup instance)

**Endpoint:** newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com

**Status:** ❌ Not accessible
**Error:** connect ETIMEDOUT

