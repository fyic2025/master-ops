const { getMySqlQuery } = require("../config/mysql");
const BigCommerce = require("node-bigcommerce");
const fs = require("fs");
const path = require("path");
const lodash = require("lodash");
const moment = require("moment");
const cliProgress = require("cli-progress");
const {
  sleep,
  writeJsonFile,
  writeCSVFile,
  writeJsonFileCron,
  readJsonFile,
} = require("../util/app.util");
const Excel = require("exceljs");
let converter = require("json-2-csv");
const sgMail = require("@sendgrid/mail");
const { isDev } = require("../config/app");
const unlinkedProducts = require("../../unlinkedProducts.json");
const { uploadFile } = require("../services/s3.service");
const {
  runBardGetDescriptionScore,
  getScoreJSON,
  runBardGetCatScore,
  runBardGetBlogScore,
  runBardGetCatImpDescription,
} = require("./bard-ai.helpers");
const _ = require("lodash");
const { default: axios } = require("axios");
let UNLINK_PRODUCTS = unlinkedProducts.map((d) => d.id);
// console.log(UNLINK_PRODUCTS)
sgMail.setApiKey(
  "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"
);
const bigCommerce = new BigCommerce({
  clientId: "nvmcwck5yr15lob1q911z68d4r6erxy",
  accessToken: "d9y2srla3treynpbtmp4f3u1bomdna2",
  storeHash: "hhhi",
  responseType: "json",
  apiVersion: "v3",
  headers: { "Accept-Encoding": "*" },
});
const bigCommerceV2 = new BigCommerce({
  clientId: "nvmcwck5yr15lob1q911z68d4r6erxy",
  accessToken: "d9y2srla3treynpbtmp4f3u1bomdna2",
  storeHash: "hhhi",
  responseType: "json",
  apiVersion: "v2",
  headers: { "Accept-Encoding": "*" },
});
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
function truncateTable() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("TRUNCATE bc_products");

    r(true);
  });
}
function getProductByProductId(id) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM bc_products WHERE product_id = ?",
      [id]
    );

    let isExist = !!results.length;
    if (isExist) {
      r(results[0]);
      return;
    }
    r(null);
  });
}
function getProductByOBBarcodeMatched(id) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      `SELECT bc_products.product_id,bc_products.sku,oborne_products.sku as ob_sku,bc_products.upc,oborne_products.barcode,bc_products.name,oborne_products.name FROM bc_products INNER JOIN oborne_products on bc_products.upc=oborne_products.barcode WHERE bc_products.product_id=?`,
      [id]
    );

    let isExist = !!results.length;
    if (isExist) {
      r(results[0]);
      return;
    }
    r(null);
  });
}
function getAllBCProducts(fields = "*") {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(`SELECT ${fields} FROM bc_products ORDER BY sku`);

    r(results);
  });
}
function updateProduct(product_id, data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let fkeys = Object.keys(data);
    let fields = fkeys.map((k) => `${k}=?`).join(",");
    let sql = `UPDATE bc_products SET ${fields} where product_id=?`;
    // console.log(sql, fkeys.map((k) => data[k]))
    let result1 = await query(sql, [
      ...fkeys.map((k) => data[k]),
      product_id,
    ]).catch((err) => {
      console.log(product_id, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    // console.log(result1)
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}

function insertProduct(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM bc_products WHERE product_id = ?",
      [d.id]
    );
    let isExist = !!results.length;
    let fields = `product_id=?,name=?,type=?,sku=?,weight=?,width=?,depth=?,height=?,price=?,cost_price=?,retail_price=?,sale_price=?,map_price=?,tax_class_id=?,product_tax_code=?,calculated_price=?,categories=?,brand_id=?,option_set_id=?,option_set_display=?,inventory_level=?,inventory_warning_level=?,inventory_tracking=?,reviews_rating_sum=?,reviews_count=?,total_sold=?,fixed_cost_shipping_price=?,is_free_shipping=?,is_visible=?,is_featured=?,related_products=?,warranty=?,bin_picking_number=?,layout_file=?,upc=?,mpn=?,gtin=?,search_keywords=?,availability=?,availability_description=?,gift_wrapping_options_type=?,gift_wrapping_options_list=?,sort_order=?,_condition=?,is_condition_shown=?,order_quantity_minimum=?,order_quantity_maximum=?,page_title=?,meta_keywords=?,meta_description=?,date_created=?,date_modified=?,base_variant_id=?,description=?`;
    let sql = isExist
      ? `UPDATE bc_products SET ${fields} where product_id=?`
      : `INSERT INTO bc_products SET ${fields}`;

    let result1 = await query(sql, [
      d.id,
      d.name,
      d.type,
      d.sku,
      d.weight,
      d.width,
      d.depth,
      d.height,
      d.price,
      d.cost_price,
      d.retail_price,
      d.sale_price,
      d.map_price,
      d.tax_class_id,
      d.product_tax_code,
      d.calculated_price,
      JSON.stringify(d.categories),
      d.brand_id,
      d.option_set_id,
      d.option_set_display,
      d.inventory_level,
      d.inventory_warning_level,
      d.inventory_tracking,
      d.reviews_rating_sum,
      d.reviews_count,
      d.total_sold,
      d.fixed_cost_shipping_price,
      d.is_free_shipping,
      d.is_visible,
      d.is_featured,
      JSON.stringify(d.related_products),
      d.warranty,
      d.bin_picking_number,
      d.layout_file,
      d.upc,
      d.mpn,
      d.gtin,
      d.search_keywords,
      d.availability,
      d.availability_description,
      d.gift_wrapping_options_type,
      JSON.stringify(d.gift_wrapping_options_list),
      d.sort_order,
      d.condition,
      d.is_condition_shown,
      d.order_quantity_minimum,
      d.order_quantity_maximum,
      d.page_title,
      JSON.stringify(d.meta_keywords),
      d.meta_description,
      moment(d.date_created).format("YYYY-MM-DD hh:mm:ss"),
      moment(d.date_modified).format("YYYY-MM-DD hh:mm:ss"),
      d.base_variant_id,
      d.description,
      ...(isExist ? [d.id] : []),
    ]).catch((err) => {
      console.log(d.id, isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}
exports.insertBigCommerceProduct = insertProduct;
exports.getBigComProducts = async (truncate = true) => {
  if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 250;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  let metaData = await bigCommerce
    .get(`/catalog/products?limit=${limit}`)
    .catch(console.log);
  console.log(metaData?.meta?.pagination);
  let finalData = [];
  if (metaData) {
    let total_pages = metaData.meta.pagination.total_pages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let res = await bigCommerce
        .get(`/catalog/products?limit=${limit}&page=${j}`)
        .catch(console.log);
      if (res) {
        // let total_products = res.data.length;

        finalData = finalData.concat(res.data);
        let dataChunks = lodash.chunk(res.data, 50);
        let totalChunks = dataChunks.length;

        for (let i = 0; i < totalChunks; i++) {
          let dataRow = dataChunks[i];

          await Promise.allSettled(
            dataRow.map((row) => {
              return insertProduct(row);
            })
          );
        }

        // await Promise.allSettled(
        //   res.data.map((row) => {
        //     return insertProduct(row);
        //   })
        // );
      }
      bar1.increment();
    }
  }
  bar1.stop();

  writeJsonFileCron("bc", finalData);

  console.log("Success");
};

async function readCSVFile(filePath) {
  // let pathData = path.parse(filePath);
  //let jsonFilePath = path.join(pathData.dir, pathData.name + ".json");
  const workbook = new Excel.Workbook();
  const reader = fs.createReadStream(filePath);
  console.log("file reading...", filePath);
  const worksheet = await workbook.csv.read(reader);
  let header = [];
  let data = [];
  worksheet.eachRow(function (row, rowNumber) {
    // console.log(row.values);
    if (rowNumber == 1) {
      row.eachCell(function (cell, colNumber) {
        header = [...header, cell.value];
        // console.log('Cell ' + colNumber + ' = ' + cell.value);
      });
    } else {
      let item = {};
      row.eachCell(function (cell, colNumber) {
        item = { ...item, [header[colNumber - 1]]: cell.value };

        // console.log('Cell ' + colNumber );
      });
      data.push(item);
    }
  });
  ////json file ////////
  // fs.writeFileSync(jsonFilePath, JSON.stringify(data));
  //////////
  return data;
}
async function readXLSXFile(filePath) {
  // let pathData = path.parse(filePath);
  //let jsonFilePath = path.join(pathData.dir, pathData.name + ".json");
  const workbook = new Excel.Workbook();
  const reader = fs.createReadStream(filePath);
  console.log("file reading...", filePath);
  const worksheet = await workbook.csv.read(reader);
  // const worksheet = workbook.getWorksheet("Sheet1");
  // return {a:workbook.worksheets.length,d:worksheet}
  let header = [];
  let data = [];
  worksheet.eachRow(function (row, rowNumber) {
    // console.log(row.values);
    if (rowNumber == 1) {
      row.eachCell(function (cell, colNumber) {
        header = [...header, cell.value];
        // console.log('Cell ' + colNumber + ' = ' + cell.value);
      });
    } else {
      let item = {};
      row.eachCell(function (cell, colNumber) {
        item = { ...item, [header[colNumber - 1]]: cell.value };

        // console.log('Cell ' + colNumber );
      });
      data.push(item);
    }
  });
  ////json file ////////
  // fs.writeFileSync(jsonFilePath, JSON.stringify(data));
  //////////
  return data;
}

function getAllProducts() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = `SELECT * FROM bc_products WHERE inventory_tracking  !='product'`;
    sql = `SELECT * FROM bc_products_final1`;
    sql = `SELECT * FROM bc_products_final2`;
    sql = `SELECT * FROM bc_products WHERE categories LIKE '%[]%'`;
    ///////////

    //////UHP DELETED////////
    sql = `SELECT uhp_products.in_stock,
    bc_products_final.product_id ,
    uhp_products.id,
    uhp_products.sku as uhp_sku,
    bc_products_final.sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN uhp_products on LOCATE(uhp_products.sku, CONCAT("UN - ",bc_products_final.sku))
    WHERE uhp_products.id IS NULL AND bc_products_final.sku LIKE '%UN -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200`;

    //////UHP OUT OF STOCK////////
    sql = `SELECT uhp_products.in_stock,
     bc_products.product_id ,
     uhp_products.id,
     uhp_products.sku as uhp_sku,
     bc_products.sku,
     bc_products.paired,
     bc_products.inventory_level
     FROM bc_products
     LEFT JOIN uhp_products on LOCATE(uhp_products.sku, CONCAT("UN - ",bc_products.sku))
     WHERE uhp_products.id IS NOT NULL AND bc_products.sku LIKE '%UN -%' and bc_products.paired=1 and bc_products.inventory_level>200 and uhp_products.in_stock ='N'`;

    //////oborne DELETED////////
    sql = `SELECT oborne_products.availability,
    bc_products_final.product_id ,
    oborne_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN oborne_products on LOCATE(oborne_products.sku, CONCAT("OB - ",bc_products_final.sku))
    WHERE oborne_products.id IS NULL AND bc_products_final.sku LIKE '%OB -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200`;

    //////oborne OUT OF STOCK////////
    sql = `SELECT oborne_products.availability,
    bc_products_final.product_id ,
    oborne_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN oborne_products on LOCATE(oborne_products.sku, CONCAT("OB - ",bc_products_final.sku))
    WHERE oborne_products.id IS NOT NULL AND bc_products_final.sku LIKE '%OB -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200 and oborne_products.availability ='Out of Stock'`;

    ///////kadac_products DELETED////////
    sql = `SELECT kadac_products.stockstatus,
    bc_products_final.product_id ,
    kadac_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN kadac_products on LOCATE(kadac_products.sku, CONCAT("KAD - ",bc_products_final.sku))
    WHERE kadac_products.id IS NULL AND bc_products_final.sku LIKE '%KAD -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200`;

    ///////kadac_products OUT OF STOCK////////
    sql = `SELECT kadac_products.stockstatus,
    bc_products_final.product_id ,
    kadac_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN kadac_products on LOCATE(kadac_products.sku, CONCAT("KAD - ",bc_products_final.sku))
    WHERE kadac_products.id IS NOT NULL AND bc_products_final.sku LIKE '%KAD -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200 and kadac_products.stockstatus IN ('deleted', 'outofstock', 'discontinued')`; //outofstock|discontinued|deleted|available

    ///////globalnature_products DELETED////////
    sql = `SELECT globalnature_products.stockstatus,
    bc_products_final.product_id ,
    globalnature_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN globalnature_products on LOCATE(globalnature_products.sku, CONCAT("GBN - ",bc_products_final.sku))
    WHERE globalnature_products.id IS NULL AND bc_products_final.sku LIKE '%GBN -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200`;

    ///////globalnature_products OUT OF STOCK////////
    sql = `SELECT globalnature_products.stockstatus,
    bc_products_final.product_id ,
    globalnature_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN globalnature_products on LOCATE(globalnature_products.sku, CONCAT("GBN - ",bc_products_final.sku))
    WHERE globalnature_products.id IS NOT NULL AND bc_products_final.sku LIKE '%GBN -%' and bc_products_final.paired=1 and bc_products_final.inventory_level>200 and globalnature_products.stockstatus IN ('deleted', 'outofstock', 'discontinued')`; //outofstock|discontinued|deleted|available

    //////oborne barcode OUT OF STOCK////////
    sql = `SELECT oborne_products.availability,
    bc_products_final.product_id ,
    oborne_products.sku ,
    bc_products_final.sku as bc_sku,
    bc_products_final.paired,
    bc_products_final.inventory_level
    FROM bc_products_final
    LEFT JOIN oborne_products on LOCATE(oborne_products.sku, CONCAT("OB - ",bc_products_final.sku))
    WHERE oborne_products.id IS NOT NULL AND bc_products_final.sku LIKE '%OB -%' and bc_products_final.paired=2 and bc_products_final.inventory_level>200 `;
    // and oborne_products.availability ='Out of Stock'
    //invl >200  or onbrene outof stock ,paired 2 invl =0, else 1000

    sql = `SELECT oborne_products.availability, bc_products_final.product_id , oborne_products.sku , bc_products_final.sku as bc_sku, bc_products_final.paired, bc_products_final.inventory_level FROM bc_products_final LEFT JOIN oborne_products on bc_products_final.upc =oborne_products.barcode WHERE oborne_products.id IS NOT NULL AND bc_products_final.sku LIKE '%OB -%' and bc_products_final.paired=2 and bc_products_final.inventory_level>200 and oborne_products.availability ='Out of Stock'`;
    ///////////////////////
    sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on LOCATE(CONCAT_WS(" - ", "UN", uhp_products.sku) , bc_products.sku) WHERE uhp_products.id IS NOT NULL;`;

    sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN", uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS  NULL and bc_products.sku LIKE 'UN - %'  and bc_products.inventory_level>200 ;`;
    sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN", uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL;`;

    sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN", uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL;`;

    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1) FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku);`;

    ///////////////////////////////////////////////
    ////////////////////////////////////////////
    /////ob out of stock
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.sku,CONCAT_WS(" - ", "OB",oborne_products.sku) FROM bc_products 
    left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.inventory_level>200 and oborne_products.availability ='Out of Stock';`;

    //ob in stock
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.sku,CONCAT_WS(" - ", "OB",oborne_products.sku) FROM bc_products 
    left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.inventory_level=0 and oborne_products.availability ='In Stock'`;

    ///ob deleted
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.sku,CONCAT_WS(" - ", "OB",oborne_products.sku) FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NULL and bc_products.sku LIKE 'OB - %' and bc_products.inventory_level>200;`;

    // // //ob barcode out of stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level,oborne_products.sku,bc_products.sku, oborne_products.barcode,bc_products.upc FROM bc_products
    // left JOIN oborne_products on oborne_products.barcode =bc_products.upc WHERE oborne_products.id IS NOT NULL and bc_products.upc!='N/A' and bc_products.sku LIKE 'OB - %' and bc_products.inventory_level>200 and oborne_products.availability ='Out of Stock';`;

    // // //ob barcode in stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level,oborne_products.sku,bc_products.sku, oborne_products.barcode,bc_products.upc FROM bc_products
    // left JOIN oborne_products on oborne_products.barcode =bc_products.upc WHERE oborne_products.id IS NOT NULL and bc_products.upc!='N/A' and bc_products.sku LIKE 'OB - %' and bc_products.inventory_level=0 and oborne_products.availability ='In Stock';`;

    // /////ob colon sku product in stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1) FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level=0 and oborne_products.availability ='In Stock';`;

    // /////ob colon sku out of stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1) FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level>200 and oborne_products.availability ='Out of Stock'`;

    //  /////UHP out of stock
    //  sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.sku,CONCAT_WS(" - ", "UN",uhp_products.sku) FROM bc_products
    //  left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.inventory_level>200 and uhp_products.in_stock ='N';`;

    //  ///UHP in stock
    //  sql=`SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.sku,CONCAT_WS(" - ", "UN",uhp_products.sku) FROM bc_products
    //  left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.inventory_level=0 and uhp_products.in_stock ='Y';`

    // /UHP deleted
    //  sql=`SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.sku,CONCAT_WS(" - ", "UN",uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NULL and bc_products.sku LIKE 'UN - %' and bc_products.inventory_level>200`

    // //  /////kadac_products out of stock
    //  sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.sku,CONCAT_WS(" - ", "KAD",kadac_products.sku) FROM bc_products
    //  left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NOT NULL and bc_products.inventory_level>200 and kadac_products.stockstatus IN ('deleted', 'outofstock', 'discontinued');`;

    // //  /////kadac_products in stock
    //  sql=`SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.sku,CONCAT_WS(" - ", "KAD",kadac_products.sku) FROM bc_products
    //  left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NOT NULL and bc_products.inventory_level=0 and kadac_products.stockstatus IN ('available');`

    // //  /////kadac_products deleted
    //  sql=`SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.sku,CONCAT_WS(" - ", "KAD",kadac_products.sku) FROM bc_products
    //  left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NULL and bc_products.sku LIKE 'KAD - %' and bc_products.inventory_level>200;`

    // //    /////globalnature_products out of stock
    //    sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku) FROM bc_products
    //    left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NOT NULL and bc_products.inventory_level>200 and globalnature_products.stockstatus IN ('deleted', 'outofstock', 'discontinued');`;

    // /////globalnature_products in stock
    // sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku) FROM bc_products
    // left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NOT NULL and bc_products.inventory_level=0 and globalnature_products.stockstatus IN ('available');`;

    //    /////globalnature_products out of stock
    //  sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku) FROM bc_products
    //  left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NULL and bc_products.sku LIKE 'GBN - %' and bc_products.inventory_level>200;`;

    /////////////////////////////////////
    /////////////////////

    // SELECT oborne_products.availability,
    // bc_products.product_id ,
    // oborne_products.sku ,
    // bc_products.sku as bc_sku,

    // bc_products.inventory_level,
    // CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ":", -1)),SUBSTRING_INDEX(oborne_products.sku, ":", -1)
    // FROM bc_products
    // LEFT JOIN oborne_products on LOCATE(SUBSTRING_INDEX(oborne_products.sku, ":", -1), bc_products.sku) WHERE oborne_products.sku LIKE '%:%';

    //     sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN", uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.sku LIKE '%UN - %' and bc_products.inventory_level>200 and uhp_products.in_stock ='N'

    // UNION

    // SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN", uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NULL and bc_products.sku LIKE '%UN - %' and bc_products.inventory_level>200

    // UNION

    // SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock, uhp_products.sku,bc_products.sku,bc_products.inventory_level,CONCAT_WS(" - ", "UN", uhp_products.sku) FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN", uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.sku LIKE '%UN - %' and bc_products.inventory_level<200 and uhp_products.in_stock ='Y'
    // `;

    // sql=`SELECT bc_products.upc FROM oborne_products  inner JOIN bc_products on CONCAT_WS(" - ", "OB",oborne_products.sku) !=bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.sku LIKE 'OB - %';`

    let result1 = await query(sql).catch((err) => {
      console.log("[getAllProducts]", err.sqlMessage);
      // res.send(errorResponse(err.message));
    });

    r(result1);
  });
}

function getOBProducts() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = ``;
    let products = [];
    ///////////////////////////////////////////////
    ////////////////////////////////////////////
    ///ob product
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,oborne_products.new_sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku) as s1,"OB" as keyword,bc_products.availability as bc_availability,oborne_products.rrp,oborne_products.ws_ex_gst FROM bc_products 
    left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL;`;

    let result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob product", result?.length);
    if (result) products = products.concat(result);

    //ob colon product
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,oborne_products.new_sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) as s1,SUBSTRING_INDEX(oborne_products.sku, ": ", -1) as s2,"OB-colon" as keyword ,bc_products.availability as bc_availability,oborne_products.rrp,oborne_products.ws_ex_gst FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku);`;

    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob colon product", result?.length);
    if (result) products = products.concat(result);

    //ob deleted product
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,oborne_products.new_sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku) as s1,"OB-delete" as keyword,bc_products.availability as bc_availability,oborne_products.rrp,oborne_products.ws_ex_gst  FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NULL and bc_products.sku LIKE 'OB - %' and bc_products.inventory_level>200;`;

    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob deleted product", result?.length);
    if (result) products = products.concat(result);

    ///ob colon deleted product
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,oborne_products.new_sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) as s1,SUBSTRING_INDEX(oborne_products.sku, ": ", -1) as s1,"OB-delete" as keyword ,bc_products.availability as bc_availability,oborne_products.rrp,oborne_products.ws_ex_gst FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS  NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level>200;`;
    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob colon deleted product", result?.length);
    if (result) products = products.concat(result);

    // writeJsonFile("ob", products);

    let nondeleted = products.filter((p) => {
      return p.keyword != "OB-delete";
    });

    let deleted = products
      .filter((p) => {
        return p.keyword == "OB-delete";
      })
      .filter((p) => {
        return !nondeleted.find((d) => d.product_id == p.product_id);
      });

    let instock = nondeleted.filter((p) => {
      return (
        p.availability == "In Stock" &&
        (p.inventory_level == 0 || p.inventory_level > 200) &&
        p.inventory_level != 1000
        //p.bc_availability != "available"
      );
      // return p.inventory_level == 0 && p.availability == "In Stock";
    });
    let instockDisabled = nondeleted.filter((p) => {
      return (
        p.bc_availability != "available" &&
        p.inventory_level > 0 &&
        p.availability == "In Stock"
      );
    });
    // let instock200 = nondeleted.filter((p) => {
    //   return p.inventory_level >200 && p.inventory_level !=1000 && p.availability == "In Stock";
    // });
    let outofstock = nondeleted.filter((p) => {
      return p.inventory_level > 200 && p.availability == "Out of Stock";
    });

    let finalProducts = [].concat(
      deleted,
      instock,
      instockDisabled,
      outofstock
    );

    console.log(
      "ob deleted-",
      deleted.length,
      "\n",
      "ob instock-",
      instock.length,
      "\n",
      "ob instockDisabled-",
      instockDisabled.length,
      "\n",
      "ob outofstock-",
      outofstock.length,
      "\n",
      "ob total-",
      finalProducts.length,
      "\n"
    );
    r(finalProducts);
  });
}
exports.getOBProducts = getOBProducts;

function getProducts(
  config = {
    kadac: true,
    ob: true,
    gbn: true,
    uhp: true,
    kik: true,
  }
) {
  let { kadac = true, ob = true, gbn = true, uhp = true, kik = true } = config;
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = ``;
    let products = [];
    ///////////////////////////////////////////////
    ////////////////////////////////////////////
    ///ob out of stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku),"OB" as keyword,bc_products.availability as bc_availability  FROM bc_products
    // left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.inventory_level>200 and oborne_products.availability ='Out of Stock';`;

    // let result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log("ob out of stock", result?.length);
    // if (result) products = products.concat(result);

    // //ob in stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku),"OB" as keyword,bc_products.availability as bc_availability  FROM bc_products
    // left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.inventory_level=0 and oborne_products.availability ='In Stock'`;

    // result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log("ob in stock", result?.length);
    // if (result) products = products.concat(result);

    // //ob in stock inventory_level>200=1000
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku),"OB" as keyword,bc_products.availability as bc_availability  FROM bc_products
    // left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.inventory_level>200 and bc_products.inventory_level!=1000 and oborne_products.availability ='In Stock'`;

    // result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log("ob in stock inventory_level>200=1000", result?.length);
    // if (result) products = products.concat(result);

    // ////////////ob deleted
    // // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku),"OB-delete" as keyword,bc_products.availability as bc_availability  FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NULL and bc_products.sku LIKE 'OB - %' and bc_products.inventory_level>200;`;
    // // result = await query(sql).catch((err) => {
    // //   console.log("[getProducts]", err.sqlMessage);
    // // });
    // // console.log("ob deleted", result?.length);
    // // if (result) products = products.concat(result);

    // ///ob colon sku product in stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1),"OB" as keyword ,bc_products.availability as bc_availability FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level=0 and oborne_products.availability ='In Stock';`;
    // result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log("ob colon sku product in stock", result?.length);
    // if (result) products = products.concat(result);

    // ///ob colon sku product in stock inventory_level>200=1000
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1),"OB" as keyword ,bc_products.availability as bc_availability FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level>200 and bc_products.inventory_level!=1000 and oborne_products.availability ='In Stock';`;
    // result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log(
    //   "ob colon sku product in stock inventory_level>200=1000",
    //   result?.length
    // );
    // if (result) products = products.concat(result);

    // /////ob colon sku out of stock
    // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1),"OB" as keyword ,bc_products.availability as bc_availability FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level>200 and oborne_products.availability ='Out of Stock'`;
    // result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log("ob colon sku out of stock", result?.length);
    // if (result) products = products.concat(result);

    // /////ob colon sku deleted
    // // sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1),"OB-colon-deleted" as keyword ,bc_products.availability as bc_availability FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS  NULL and POSITION(":" IN oborne_products.sku) and bc_products.inventory_level>200 `;
    // // result = await query(sql).catch((err) => {
    // //   console.log("[getProducts]", err.sqlMessage);
    // // });
    // // console.log("ob colon sku deleted", result?.length);
    // // if (result) products = products.concat(result);
    if (ob) {
      let obProducts = await getOBProducts();
      products = products.concat(obProducts);
    }
    if (uhp) {
      /////UHP out of stock
      sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "UN",uhp_products.sku),"UN" as keyword ,bc_products.availability as bc_availability FROM bc_products
     left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.inventory_level>200 and uhp_products.in_stock ='N';`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("UHP out of stock", result?.length);
      if (result) products = products.concat(result);

      ///UHP in stock
      sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "UN",uhp_products.sku),"UN" as keyword,bc_products.availability as bc_availability  FROM bc_products
     left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and (bc_products.inventory_level=0 OR bc_products.inventory_level>200) and bc_products.inventory_level!=1000  and uhp_products.in_stock ='Y';`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("UHP in stock", result?.length);
      if (result) products = products.concat(result);

      ///UHP in stock inventory_level>200=1000
      sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "UN",uhp_products.sku),"UN" as keyword ,bc_products.availability as bc_availability FROM bc_products
       left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.inventory_level>0 and bc_products.availability!='available' and uhp_products.in_stock ='Y';`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("UHP in stock inventory_level>200=1000", result?.length);
      if (result) products = products.concat(result);

      /////UHP deleted
      sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level, uhp_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "UN",uhp_products.sku),"UN-deleted" as keyword ,bc_products.availability as bc_availability FROM bc_products left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NULL and bc_products.sku LIKE 'UN - %' and bc_products.inventory_level>200`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("UHP deleted", result?.length);
      if (result) products = products.concat(result);
    }
    // if (kadacStatus) {
    //   //temp Kadac propduct
    //   sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KAD",kadac_products.sku),"KAD" as keyword,bc_products.availability as bc_availability  FROM bc_products
    // left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE bc_products.sku in ('KAD - 422419','KAD - 6062','KAD - 6132','KAD - 78928','KAD - 488121','KAD - 491363','KAD - 487755')`;
    //   result = await query(sql).catch((err) => {
    //     console.log("[getProducts]", err.sqlMessage);
    //   });
    //   console.log("kadac_products out of stock", result?.length);
    //   if (result) products = products.concat(result);
    // }

    if (kadac) {
      //  /////kadac_products out of stock
      sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KAD",kadac_products.sku),"KAD" as keyword,bc_products.availability as bc_availability  FROM bc_products
     left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NOT NULL and bc_products.inventory_level>200 and kadac_products.stockstatus IN ('deleted', 'outofstock', 'discontinued');`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("kadac_products out of stock", result?.length);
      if (result) products = products.concat(result);

      //  /////kadac_products in stock
      sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KAD",kadac_products.sku),"KAD" as keyword,bc_products.availability as bc_availability  FROM bc_products
     left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NOT NULL and (bc_products.inventory_level=0 OR bc_products.inventory_level>200) and bc_products.inventory_level!=1000   and kadac_products.stockstatus IN ('available');`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("kadac_products in stock", result?.length);
      if (result) products = products.concat(result);

      //  /////kadac_products in stock inventory_level>200=1000
      sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KAD",kadac_products.sku),"KAD" as keyword,bc_products.availability as bc_availability  FROM bc_products
     left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NOT NULL and bc_products.inventory_level>0 and bc_products.availability!='available' and kadac_products.stockstatus IN ('available');`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log(
        "kadac_products in stock inventory_level>200 = 1000",
        result?.length
      );
      if (result) products = products.concat(result);

      //  /////kadac_products deleted
      sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level, kadac_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KAD",kadac_products.sku),"KAD-deleted" as keyword ,bc_products.availability as bc_availability  FROM bc_products
     left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NULL and bc_products.sku LIKE 'KAD - %' and bc_products.inventory_level>200;`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("kadac_products deleted", result?.length);
      if (result) products = products.concat(result);
    }

    if (gbn) {
      //    /////globalnature_products out of stock
      sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku),"GBN" as keyword ,bc_products.availability as bc_availability  FROM bc_products
       left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NOT NULL and bc_products.inventory_level>200 and globalnature_products.stockstatus IN ('deleted', 'outofstock', 'discontinued');`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("globalnature_products out of stock", result?.length);
      if (result) products = products.concat(result);

      /////globalnature_products in stock
      sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku),"GBN" as keyword ,bc_products.availability as bc_availability  FROM bc_products
    left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NOT NULL and (bc_products.inventory_level=0 OR bc_products.inventory_level>200) and bc_products.inventory_level!=1000   and globalnature_products.stockstatus IN ('available');`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("globalnature_products in stock", result?.length);
      if (result) products = products.concat(result);

      /////globalnature_products in stock inventory_level>200=1000
      sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku),"GBN" as keyword ,bc_products.availability as bc_availability  FROM bc_products
    left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NOT NULL and bc_products.inventory_level>0 and bc_products.availability!='available' and globalnature_products.stockstatus IN ('available');`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log(
        "globalnature_products in stock inventory_level>200=1000",
        result?.length
      );
      if (result) products = products.concat(result);

      /////globalnature_products deleted
      sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku),"GBN-deleted" as keyword ,bc_products.availability as bc_availability FROM bc_products
     left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NULL and bc_products.sku LIKE 'GBN - %' and bc_products.inventory_level>200;`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("globalnature_products deleted", result?.length);
      if (result) products = products.concat(result);
    }
    if (kik) {
      //  /////kik_products out of stock
      sql = `SELECT bc_products.id,bc_products.product_id,kik_products.AvailableQty, bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,"KIK" as keyword,bc_products.availability as bc_availability FROM bc_products
    left JOIN kik_products on CONCAT_WS(" - ", "KIK",kik_products.sku) =bc_products.sku WHERE kik_products.id IS NOT NULL and kik_products.AvailableQty!= bc_products.inventory_level and bc_products.categories NOT LIKE '%2133%'
    UNION ALL
    SELECT bc_products.id,bc_products.product_id,kik_products.AvailableQty, bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,"KIK" as keyword ,bc_products.availability as bc_availability FROM bc_products
    left JOIN kik_products on kik_products.sku =bc_products.sku WHERE kik_products.id IS NOT NULL and kik_products.AvailableQty!= bc_products.inventory_level and bc_products.categories NOT LIKE '%2133%';`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("kik_products ", result?.length);
      if (result) products = products.concat(result);

      // //  /////kik_products in stock
      // sql = `SELECT bc_products.id,bc_products.product_id,kik_products.AvailableQty, bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KIK",kik_products.sku) FROM bc_products
      // left JOIN kik_products on CONCAT_WS(" - ", "KIK",kik_products.sku) =bc_products.sku WHERE kik_products.id IS NOT NULL and kik_products.AvailableQty>0 and bc_products.inventory_level=0 and bc_products.categories NOT LIKE '%2133%'
      // UNION ALL
      // SELECT bc_products.id,bc_products.product_id,kik_products.AvailableQty, bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KIK",kik_products.sku) FROM bc_products
      // left JOIN kik_products on kik_products.sku =bc_products.sku WHERE kik_products.id IS NOT NULL and kik_products.AvailableQty>0 and bc_products.inventory_level=0 and bc_products.categories NOT LIKE '%2133%'`;
      // result = await query(sql).catch((err) => {
      //   console.log("[getProducts]", err.sqlMessage);
      // });
      // console.log("kik_products in stock", result?.length);
      // if (result) products = products.concat(result);

      //  /////kik_products deleted
      sql = `SELECT bc_products.id,bc_products.product_id,kik_products.AvailableQty, bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,"KIK-deleted" as keyword,bc_products.availability as bc_availability FROM bc_products
    left JOIN kik_products on kik_products.sku =bc_products.sku WHERE kik_products.id IS NULL and bc_products.sku LIKE 'KIK - %' and bc_products.inventory_level>0 and bc_products.categories NOT LIKE '%2133%';`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("kik_products deleted", result?.length);
      if (result) products = products.concat(result);

      /////KIK - Teelixir Products
      sql = `SELECT bc_products.id,bc_products.product_id,"" as stockstatus,bc_products.inventory_level, bc_products.sku,bc_products.name,bc_products.sku as bc_sku , "KIK - Teelixir" as keyword,bc_products.availability as bc_availability FROM bc_products WHERE categories LIKE '%2133%'`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts]", err.sqlMessage);
      });
      console.log("KIK - Teelixir Products", result?.length);
      if (result) products = products.concat(result);
    }
    /////////////////////////////////////
    /////////////////////

    // let result1 = await query(sql).catch((err) => {
    //   console.log("[getAllProducts]", err.sqlMessage);
    //   // res.send(errorResponse(err.message));
    // });

    r(products);
  });
}

let errors = [];

let p = getFailedProducts([]);
let filename = `bc_log`;
// filename = `uhp_prods_1679411095707`;
let filePath = path.resolve("download-files", `${filename}.log`);
exports.updateBCInvTracProducts = async (
  callApi = false,
  config = {
    kadac: true,
    ob: true,
    gbn: true,
    uhp: true,
    kik: true,
  }
) => {
  let { kadac = true, ob = true, gbn = true, uhp = true, kik = true } = config;

  console.log("Fetching all products.....");
  let limit = 1;
  // let products = await getAllProducts();
  let products = await getProducts({
    kadac,
    ob,
    gbn,
    uhp,
    kik,
  });
  // let products = await readCSVFile(
  //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/301.csv"
  // );
  // let products=p;
  // let products = await readXLSXFile(
  //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/unlinkproduct.csv"
  // );
  // products = products.filter((d) => d.status == "Y");
  console.log(
    products.length
    // products,
    //  products.map((d) => (d.bc_sku)).join(" | ")
  );
  // writeCSVFile('_products',products)
  // console.log("Success");
  //  return;
  fs.writeFileSync(filePath, ``);
  let updatedProducts = [];

  if (products) {
    let dataChunks = lodash.chunk(products, limit);
    let totalChunks = dataChunks.length;
    bar1.start(totalChunks, 0);
    for (let i = 0; i < totalChunks; i++) {
      let dataRow = dataChunks[i]
        .map((d) => {
          // let ct = JSON.parse(d.categories);

          // if (UNLINK_PRODUCTS.includes(d.product_id)) {
          //   console.log("UNLINK DETECT", d.product_id);
          //   return false;
          // }

          let status = d.availability || d.in_stock || d.stockstatus;
          if (d.AvailableQty !== undefined) {
            status = d.AvailableQty > 0 ? "Y" : "N";
          }

          let inStockInvLevel =
            d.inventory_level == 0 || d.inventory_level > 200
              ? 1000
              : d.inventory_level;
          let inventory_level = [
            "Out of Stock",
            "N",
            "deleted",
            "outofstock",
            "discontinued",
            undefined,
            null,
          ].includes(status)
            ? 0
            : inStockInvLevel;

          if (d.keyword == "KIK - Teelixir") {
            inventory_level = 1000;
          } else if (d.keyword == "KIK") {
            let qty = d.AvailableQty || 0;
            inventory_level = qty > 0 ? qty : 0;
          } else if (d.keyword == "OB" && d.rrp < d.ws_ex_gst) {
            inventory_level = 0;
          }

          ////for temporary
          // if (d.keyword == "KAD") {
          //   inventory_level = 1000;
          // }

          let availability =
            inventory_level > 0 ? "available" : d.bc_availability;

          let ignore = "NO";
          if (UNLINK_PRODUCTS.includes(d.product_id)) {
            // console.log("UNLINK DETECT", d.product_id);
            inventory_level = 0;
            ignore = "YES";
            // return false;
          }

          return {
            //id: d.id,
            id: d.product_id,
            bc_sku: d.bc_sku,
            sku: d.sku,
            name: d.name,

            old_availability: d.bc_availability,
            availability: availability,
            status: status,
            old_inventory_level: d.inventory_level,
            // "categories":[2131],//other category
            // categories:d.categories,
            // categories: [...ct, 2132], //301_redirect category
            // inventory_level: d.inventory_level,
            inventory_level: inventory_level,

            keyword: d.keyword ?? "",
            AvailableQty: d.AvailableQty ?? "",
            ignore,
            // inventory_level:0
            // sku:d.BC_SKU,
            // bc_sku:d.bc_sku
            // data:d
            // inventory_level: d.in_stock == "Y" ? 1000 : 0,
            // inventory_level: d.availability == "In Stock" ? 1000 : 0,
            // sale_price: d.sale_price,
            //    inventory_tracking: "product",
            // a:d.availability
            // in_stock:d.inventory_level
          };
        })
        .filter(Boolean);
      // console.log("dataRow dataRow", dataRow.length);
      // await sleep(20);
      if (dataRow.length) {
        let payload = dataRow.map((d) => ({
          id: d.id,
          inventory_level: d.inventory_level,
          availability: d.availability,
        }));
        // console.log("payload", payload.length);

        let res = true;
        if (callApi) {
          res = await this.updateBigComProducts(payload);
        }
        if (res) {
          updatedProducts = updatedProducts.concat(dataRow);
          if (callApi) {
            await Promise.allSettled(
              dataRow.map((d) => {
                return updateProduct(d.id, {
                  inventory_level: d.inventory_level,
                  availability: d.availability,
                });
              })
            );
          }
        }

        ////////////////////
      }
      // console.log("[dataRow]", dataRow);
      bar1.increment();
    }

    bar1.stop();
    ////////
    let ufilename = `last_bc_updated_products__`; //+new Date().getTime();
    // filename = `uhp_prods_1679411095707`;
    let ufilePath = path.resolve("download-files", `${ufilename}.json`);

    ////json file ////////
    fs.writeFileSync(ufilePath, JSON.stringify(updatedProducts));

    writeJsonFileCron("bc_update", updatedProducts);

    let cvsfilename = `last_bc_updated_products__`; //+new Date().getTime
    let csvfilePath = path.resolve("download-files", `${cvsfilename}.csv`);

    ///////insert Cron ////////
    if (!isDev) {
      let s3r = await uploadFile(ufilePath, `${new Date().getTime()}.json`, {
        ContentType: "application/json",
        Metadata: { "Content-Type": "application/json" },
      }).catch((e) => {
        console.log("s3 err", e);
      });

      if (s3r) {
        console.log(s3r.Location);
        let query = getMySqlQuery();

        let result1 = await query("INSERT INTO crons SET ?", {
          name: `BOO daily availability cron`,
          date_time: moment().format("YYYY-MM-DD HH:mm:ss"),
          url: s3r.Location,
        }).catch((err) => {
          console.log(err.sqlMessage);
          // res.send(errorResponse(err.message));
        });
        if (result1) {
          console.log("cron_inserted");
        }
      }
    }

    ////csv file ////////

    const csv = await converter.json2csv(updatedProducts);
    !!csv.trim() && fs.writeFileSync(csvfilePath, csv);

    if (!isDev) {
      !!csv.trim() && sendMail(csvfilePath);
    }
    // console.log(csv,!!csv.trim())
    //////////
    //////

    let filename = `bc_log_products`;
    // filename = `uhp_prods_1679411095707`;
    let filePath = path.resolve("download-files", `${filename}.json`);

    ////json file ////////
    fs.writeFileSync(filePath, JSON.stringify(errors));
    //////////
  }
  console.log("Success");
};
exports.updateBigComCategory = async (id, data, showLog = false) => {
  // console.log("Fetching metadata.....");

  let res = await bigCommerce
    .put(`/catalog/categories/${id}`, data)
    .catch((err) => {
      console.log("[updateBigComCategory]", data, err);

      fs.appendFileSync(filePath, `\n................................\n`);
      ////json file ////////
      fs.appendFileSync(filePath, JSON.stringify({ data, err }));
      //////////
      errors.push({ data, err });
    });
  showLog && console.log(res);
  return res;
  // console.log(res);

  // console.log("Success");
};
exports.updateBigComProducts = async (data, showLog = false) => {
  // console.log("Fetching metadata.....");

  let res = await bigCommerce.put(`/catalog/products`, data).catch((err) => {
    console.log("[updateBigComProducts]", err);

    fs.appendFileSync(filePath, `\n................................\n`);
    ////json file ////////
    fs.appendFileSync(filePath, JSON.stringify({ data, err }));
    //////////
    errors.push({ data, err });
  });
  showLog && console.log(res);
  return res;
  // console.log(res);

  // console.log("Success");
};
exports.addBigComProducts = async (data, showLog = false) => {
  // console.log("Fetching metadata.....");

  return bigCommerce.post(`/catalog/products`, data);
  // console.log(res);

  // console.log("Success");
};

exports.getBigComProduct = async (id) => {
  // console.log("Fetching metadata.....");

  let res = await bigCommerce.get(`/catalog/products/${id}`).catch((err) => {
    console.log("[getBigComProduct]", data, err);
    //   let filename = `bc_log`;
    //   // filename = `uhp_prods_1679411095707`;
    //   let filePath = path.resolve("download-files", `${filename}.log`);
    //   fs.appendFileSync(filePath, `\n................................\n`);
    //   ////json file ////////
    //   fs.appendFileSync(filePath, JSON.stringify({ data, err }));
    //   //////////
    //   errors.push({ data, err });
  });
  console.log(res?.data.categories);
  return res;
  // console.log(res?.data.categories);

  // console.log("Success");
};

exports.getBCCategories = async (truncate = true) => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 250;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  let metaData = await bigCommerce
    .get(`/catalog/categories?limit=${limit}`)
    .catch(console.log);
  console.log(metaData?.meta?.pagination);
  if (metaData) {
    let total_pages = metaData.meta.pagination.total_pages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    let cats = [];
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let res = await bigCommerce
        .get(`/catalog/categories?limit=${limit}&page=${j}`)
        .catch(console.log);
      if (res) {
        cats = cats.concat(res.data);
        // let total_products = res.data.length;

        // let filename = `bc_${limit}_${j}_${new Date().getTime()}`;
        // // filename = `uhp_prods_1679411095707`;
        // let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        ////json file ////////
        //fs.writeFileSync(jsonFilePath, JSON.stringify(res.data));
        //////////
        // let dataChunks = lodash.chunk(res.data, 50);
        // let totalChunks = dataChunks.length;

        // for (let i = 0; i < totalChunks; i++) {
        //   let dataRow = dataChunks[i];

        // await Promise.allSettled(
        //   dataRow.map((row) => {
        //     return insertProduct(row);
        //   })
        // );
        // }

        // await Promise.allSettled(
        //   res.data.map((row) => {
        //     return insertProduct(row);
        //   })
        // );
      }
      bar1.increment();
    }
    ////////
    let ufilename = `bc_categories`; //+new Date().getTime();
    // filename = `uhp_prods_1679411095707`;
    let ufilePath = path.resolve("download-files", `${ufilename}.json`);

    ////json file ////////
    fs.writeFileSync(ufilePath, JSON.stringify(cats));
  }
  bar1.stop();

  console.log("Success");
};
exports.getBCBrands = async (truncate = true) => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 250;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  let metaData = await bigCommerce
    .get(`/catalog/brands?limit=${limit}`)
    .catch(console.log);
  console.log(metaData?.meta?.pagination);
  if (metaData) {
    let total_pages = metaData.meta.pagination.total_pages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    let cats = [];
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let res = await bigCommerce
        .get(`/catalog/brands?limit=${limit}&page=${j}`)
        .catch(console.log);
      if (res) {
        cats = cats.concat(res.data);
        // let total_products = res.data.length;

        // let filename = `bc_${limit}_${j}_${new Date().getTime()}`;
        // // filename = `uhp_prods_1679411095707`;
        // let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        ////json file ////////
        //fs.writeFileSync(jsonFilePath, JSON.stringify(res.data));
        //////////
        // let dataChunks = lodash.chunk(res.data, 50);
        // let totalChunks = dataChunks.length;

        // for (let i = 0; i < totalChunks; i++) {
        //   let dataRow = dataChunks[i];

        // await Promise.allSettled(
        //   dataRow.map((row) => {
        //     return insertProduct(row);
        //   })
        // );
        // }

        // await Promise.allSettled(
        //   res.data.map((row) => {
        //     return insertProduct(row);
        //   })
        // );
      }
      bar1.increment();
    }
    ////////
    let ufilename = `bc_brands`; //+new Date().getTime();
    // filename = `uhp_prods_1679411095707`;
    let ufilePath = path.resolve("download-files", `${ufilename}.json`);

    ////json file ////////
    fs.writeFileSync(ufilePath, JSON.stringify(cats));
  }
  bar1.stop();

  console.log("Success");
};
exports.getBCBlogs = async (truncate = true) => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 250;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  let metaData = await bigCommerceV2
    .get(`/blog/posts?limit=${limit}`)
    .catch(console.log);
  // console.log(metaData);
  // if (metaData) {
  //   let total_pages = metaData.meta.pagination.total_pages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
  //   console.log("total_pages:", total_pages);
  //   bar1.start(total_pages, 0);
  //   let cats = [];
  //   for (let j = 1; j <= total_pages; j++) {
  //     // console.log("pages", i, total_pages);
  //     let res = await bigCommerceV2
  //       .get(`/blog/posts?limit=${limit}&page=${j}`)
  //       .catch(console.log);
  //     if (res) {
  //       cats = cats.concat(res.data);
  //       // let total_products = res.data.length;

  //       // let filename = `bc_${limit}_${j}_${new Date().getTime()}`;
  //       // // filename = `uhp_prods_1679411095707`;
  //       // let jsonFilePath = path.resolve("download-files", `${filename}.json`);
  //       ////json file ////////
  //       //fs.writeFileSync(jsonFilePath, JSON.stringify(res.data));
  //       //////////
  //       // let dataChunks = lodash.chunk(res.data, 50);
  //       // let totalChunks = dataChunks.length;

  //       // for (let i = 0; i < totalChunks; i++) {
  //       //   let dataRow = dataChunks[i];

  //       // await Promise.allSettled(
  //       //   dataRow.map((row) => {
  //       //     return insertProduct(row);
  //       //   })
  //       // );
  //       // }

  //       // await Promise.allSettled(
  //       //   res.data.map((row) => {
  //       //     return insertProduct(row);
  //       //   })
  //       // );
  //     }
  //     bar1.increment();
  //   }
  //   ////////
  let ufilename = `bc_blogs`; //+new Date().getTime();
  // filename = `uhp_prods_1679411095707`;
  let ufilePath = path.resolve("download-files", `${ufilename}.json`);

  ////json file ////////
  fs.writeFileSync(ufilePath, JSON.stringify(metaData));
  // }
  // bar1.stop();
  return metaData;
  console.log("Success");
};
exports.updateBigComBlog = async (data, showLog = false) => {
  // console.log("Fetching metadata.....");

  let res = await bigCommerceV2.put(`/blog/posts`, data).catch((err) => {
    console.log("[updateBigComBlog]", data, err);

    fs.appendFileSync(filePath, `\n................................\n`);
    ////json file ////////
    fs.appendFileSync(filePath, JSON.stringify({ data, err }));
    //////////
    errors.push({ data, err });
  });
  showLog && console.log(res);
  return res;
  // console.log(res);

  // console.log("Success");
};
// SELECT product_id, COUNT(product_id) FROM `bc_products` GROUP by product_id ORDER BY `COUNT(product_id)` DESC
//501=993
//518=988

// temp2.reduce((d, p) => {
//   return [...d, ...p.data.map((r) => r)];
// }, []);

function getFailedProducts(arr) {
  let ss = arr
    .map((r) => {
      let err = JSON.parse(r.err.responseBody);
      return { ...r, notfound: Array.isArray(err.errors) };
    })
    .filter((r) => !r.notfound)
    .reduce((d, p) => {
      return [...d, ...p.data.map((r) => ({ ...r, product_id: r.id }))];
    }, []);
  return ss;
}

function sendMail(filepath) {
  let pathToAttachment = filepath;
  let attachment = fs.readFileSync(pathToAttachment).toString("base64");

  console.log("sending... mail");
  sgMail
    .send({
      to: [
        { email: "jayson@fyic.com.au" },
        {
          email: "moudgill1193@gmail.com",
        },
      ], // Change to your recipient
      from: {
        email: "noreply@findyouridealcustomers.com.au",
        name: "BOO CRON",
      }, // Change to your verified sender
      subject: `BOO daily availability cron | ${moment().format(
        "DD MMM YYYY hh:mm A"
      )}`,
      text: "Find attachment",
      // html: "<strong></strong>",
      attachments: [
        {
          content: attachment,
          filename: `updated_products_${moment().format(
            "DD-MM-YYYY hh:mm A"
          )}.csv`,
          type: "text/csv",
          disposition: "attachment",
        },
      ],
    })
    .then((response) => {
      console.log("sending... mail Success", response[0].statusCode);
      // console.log(response[0].statusCode);
      // console.log(response[0].headers);
    })
    .catch((error) => {
      console.log("sending... mail Error");
      console.error(error);
    });
}
// sendMail('/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/last_bc_updated_products__.csv');

exports.sendtestMail = () => {
  sgMail
    .send({
      to: [{ email: "<testEmail>" }], // Change to your recipient
      from: {
        email: "noreply@.com",
        name: "BOO CRON",
      }, // Change to your verified sender
      subject: `BOO daily availability cron | ${moment().format(
        "DD MMM YYYY hh:mm A"
      )}`,
      text: "Find attachment",
      // html: "<strong></strong>",
      // attachments: [
      //   {
      //     content: attachment,
      //     filename: `updated_products_${moment().format(
      //       "DD-MM-YYYY hh:mm A"
      //     )}.csv`,
      //     type: "text/csv",
      //     disposition: "attachment",
      //   },
      // ],
    })
    .then((response) => {
      console.log("sending... mail Success", response[0].statusCode);
      // console.log(response[0].statusCode);
      // console.log(response[0].headers);
    })
    .catch((error) => {
      console.log("sending... mail Error");
      console.error(error);
    });
};

function getAllSuplierProducts() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = ``;
    let products = [];
    ///////////////////////////////////////////////
    ////////////////////////////////////////////
    /////ob
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku),oborne_products.ws_ex_gst,oborne_products.rrp,bc_products.sale_price,bc_products.categories,'OB' as sku_code  FROM bc_products
    left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.categories NOT LIKE '%2107%';`;

    let result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob ", result?.length);
    if (result) products = products.concat(result);

    /////ob colon sku
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)),SUBSTRING_INDEX(oborne_products.sku, ": ", -1),oborne_products.ws_ex_gst,oborne_products.rrp,bc_products.categories ,bc_products.sale_price,'OB' as sku_code FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku)  and bc_products.categories NOT LIKE '%2107%';`;
    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob colon sku ", result?.length);
    if (result) products = products.concat(result);

    // /////UHP
    sql = `SELECT bc_products.id,bc_products.product_id,uhp_products.in_stock,bc_products.inventory_level,uhp_products.moq,uhp_products.size, uhp_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "UN",uhp_products.sku),uhp_products.ws_ex_gst,uhp_products.rrp,bc_products.categories,bc_products.sale_price,'UN' as sku_code  FROM bc_products
    left JOIN uhp_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE uhp_products.id IS NOT NULL and bc_products.categories NOT LIKE '%2107%';`;
    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("UHP ", result?.length);
    if (result) products = products.concat(result);

    //  /////kadac_products
    sql = `SELECT bc_products.id,bc_products.product_id,kadac_products.stockstatus,bc_products.inventory_level,kadac_products.percarton ,kadac_products.cartononly ,kadac_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KAD",kadac_products.sku),kadac_products.wholesale,kadac_products.rrp,bc_products.categories,bc_products.sale_price,'KAD' as sku_code  FROM bc_products
    left JOIN kadac_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE kadac_products.id IS NOT NULL and bc_products.categories NOT LIKE '%2107%';`;
    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("kadac_products", result?.length);
    if (result) products = products.concat(result);

    //    /////globalnature_products
    sql = `SELECT bc_products.id,bc_products.product_id,globalnature_products.stockstatus,bc_products.inventory_level, globalnature_products.percarton ,globalnature_products.cartononly ,globalnature_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "GBN",globalnature_products.sku),globalnature_products.wholesale,globalnature_products.rrp,bc_products.categories,bc_products.sale_price ,'GBN' as sku_code  FROM bc_products
    left JOIN globalnature_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE globalnature_products.id IS NOT NULL and bc_products.categories NOT LIKE '%2107%';`;
    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("globalnature_products ", result?.length);
    if (result) products = products.concat(result);

    // //  ////////  /////kik/////////////////////
    // sql = `SELECT bc_products.id,bc_products.product_id,bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KIK",kik_products.sku),bc_products.categories,bc_products.sale_price ,'KIK' as sku_code  FROM bc_products
    // left JOIN kik_products on CONCAT_WS(" - ", "KIK",kik_products.sku) =bc_products.sku WHERE kik_products.id IS NOT NULL
    // UNION ALL
    // SELECT bc_products.id,bc_products.product_id,bc_products.inventory_level, kik_products.sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "KIK",kik_products.sku),bc_products.categories,bc_products.sale_price ,'KIK' as sku_code  FROM bc_products
    // left JOIN kik_products on kik_products.sku =bc_products.sku WHERE kik_products.id IS NOT NULL;`;
    // result = await query(sql).catch((err) => {
    //   console.log("[getProducts]", err.sqlMessage);
    // });
    // console.log("kik ", result?.length);
    // if (result) products = products.concat(result);

    /////////////////////////////////////
    /////////////////////

    // let result1 = await query(sql).catch((err) => {
    //   console.log("[getAllProducts]", err.sqlMessage);
    //   // res.send(errorResponse(err.message));
    // });

    r(products);
  });
}
const supplierPerc = {
  OB: 7,
  KAD: 10,
  UN: 10,
  GBN: 12,
};
exports.supplierPerc = supplierPerc;
exports.updateBCPrices = async (callApi = false) => {
  console.log("Fetching all products.....");
  let limit = 1;
  // let products = await getAllProducts();
  let products = await getAllSuplierProducts();
  let cartonProducts = await readCSVFile(
    path.resolve("cartononly", "uhpnew.csv")
  );
  let kadp = await readCSVFile(path.resolve("cartononly", "kad.csv"));
  cartonProducts = cartonProducts.concat(kadp);
  let gbnp = await readCSVFile(path.resolve("cartononly", "gbn.csv"));
  cartonProducts = cartonProducts.concat(gbnp);

  // let products=p;
  cartonProducts = cartonProducts.filter((d) => d.Carton_Buy_Only == "yes");
  console.log("total product", products.length);
  console.log(
    "total cartonProducts",

    cartonProducts.length
  );
  // products = products.filter((p) => {
  //   let ct = JSON.parse(p.categories);

  //   return !ct.includes(2107);
  // });
  // console.log(
  //   "total product ignore 2107(Price Changes - Ignore)",
  //   products.length
  // );
  // console.log(
  //   products.length,
  //   // products,
  //   // products.map((d) => (d.product_id)).join(" | ")
  // );
  // return;
  let updatedProducts = [];
  /////////////////////////////////////////////
  // let obcartonProduct = products
  //   .filter((d) => {
  //     return d.rrp < d.ws_ex_gst;
  //   })
  //   .map((d) => {
  //     let { product_id, bc_sku, sku, name, rrp, ws_ex_gst, sale_price } = d;
  //     let text = name;

  //     text = text.substr(text.lastIndexOf(" x "));
  //     console.log("text", text);
  //     let pattern = /\d{1,3}/g;
  //     let result = text.match(pattern);
  //     let qty = 1;
  //     if (result) {
  //       qty = parseInt(result.join(""));
  //     }
  //   let  new_sale_price = parseFloat(parseFloat(qty * rrp).toFixed(2));
  //     return {
  //       product_id,
  //       bc_sku,
  //       sku,
  //       name,
  //       qty,
  //       rrp,
  //       ws_ex_gst,
  //       sale_price,
  //       new_sale_price
  //     };
  //   });
  // writeJsonFile("obpro.json", obcartonProduct);
  // writeCSVFile("ob-carton", products);
  // console.log("success", products.length);
  // return;
  ////////////////////////////////
  fs.writeFileSync(filePath, ``);
  if (products) {
    ///////find not find////
    // let notFindProducts = cartonProducts.filter((d) => {
    //   let cartonProduct = products.find(
    //     (cp) => cp.sku == d.sku && cp.sku_code == d.sku_code
    //   );
    //   return !cartonProduct;
    // });
    // console.log(
    //   "total notFindProducts for price update-",
    //   notFindProducts.length
    // );
    // await writeCSVFile("bc_price_NOt_updated_products", notFindProducts);
    /////////////////////

    products = products.map((d) => {
      // let ct = JSON.parse(d.categories);
      let sku_code = d.sku_code;

      let cartononly = "N";
      let cartonProduct = cartonProducts.find(
        (cp) => cp.sku == d.sku && cp.sku_code == sku_code
      );
      if (cartonProduct) {
        cartononly = "Y";
      }

      ///////////////////////

      let cost_price = parseFloat(d.wholesale || d.ws_ex_gst);
      let retail_price = parseFloat(d.rrp);
      let rrp = retail_price;
      /////////cartononly get from moq///////////////
      if (cartononly == "N") {
        cartononly = d.moq > 1 ? "Y" : "N";
      }
      ////////////////////////
      /////from DATABASE///
      // let cartononly =d.cartononly || (d.moq > 1 ? "Y" : "N");
      // if(sku_code=='OB' && cost_price>rrp){
      //   cartononly='Y'
      // }

      // if(sku_code=='OB' && ["55125"].includes(`${d.product_id}`)){
      //   cartononly='Y'
      // }

      /////////////
      let moq = d.moq || d.percarton;
      moq = moq ?? 0;
      let sale_price = parseFloat(d.sale_price);
      let new_sale_price = null;
      let discount_perc = 100 - (sale_price / retail_price) * 100;

      let supplier_perc = supplierPerc[sku_code];
      let applied = "";
      let formula = 0;

      if (cartononly == "Y") {
        formula = 1;
        applied = `cartononly
           (moq * rrp)
           old rrp=${retail_price}`;
        let _moq = parseFloat(moq);
        new_sale_price = parseFloat(parseFloat(_moq * retail_price).toFixed(2));
        retail_price = new_sale_price;
      } else if (
        !isFinite(discount_perc) &&
        cost_price > 0 &&
        sale_price == 0
      ) {
        formula = 2;
        applied = `not_finite and cost_price > 0 and sale_price == 0 
        (1.4 * cost_price)
        old retail_price=${retail_price}`;
        new_sale_price = parseFloat(parseFloat((1.4 * cost_price).toFixed(2)));
        retail_price = new_sale_price;
      } else if (supplier_perc < discount_perc) {
        formula = 3;
        applied = `supplier_perc < discount_perc`;
        if (sale_price > 0) {
          new_sale_price = parseFloat(
            (retail_price - (retail_price * supplier_perc) / 100).toFixed(2)
          );
        }
      }

      return {
        //id: d.id,
        id: d.product_id,
        sup_sku: d.sku,
        sku: d.bc_sku,
        name: d.name,
        sku_code: sku_code,
        cartononly,
        moq,
        price: retail_price,
        retail_price: retail_price,
        cost_price: cost_price,
        sale_price: sale_price,
        new_sale_price: new_sale_price,
        rrp,
        discount_perc: discount_perc,
        categories: d.categories,
        supplier_perc: supplier_perc,
        formula,
        applied,
      };
    });
    // .filter((d) => d.cartononly == "Y");
    // .filter((d) => d.formula == 3);
    //.filter((d) => d.cartononly == "N" && d.new_sale_price!==null && isFinite(d.discount_perc));

    //.filter((d) => d.cartononly == "N");
    //.filter((d) =>d.discount_perc==100);
    //.filter((d) => !isFinite(d.discount_perc));
    //.filter((d) => d.cartononly == "Y");
    //.filter((d) => !isFinite(d.discount_perc))
    //.filter(d=>d.new_sale_price!==null);
    //.filter(d=>isNaN( d.discount_perc));
    //.filter(d=>d.new_sale_price!==null);

    console.log("total product for price update-", products.length);

    let dataChunks = lodash.chunk(products, 10); //[1-10]
    let totalChunks = dataChunks.length;
    bar1.start(totalChunks, 0);
    for (let i = 0; i < totalChunks; i++) {
      let dataRow = dataChunks[i];

      let payload = dataRow.map((d) => ({
        id: d.id,
        price: d.price,
        retail_price: d.retail_price,
        cost_price: d.cost_price,
        ...(d.new_sale_price !== null ? { sale_price: d.new_sale_price } : {}),
      }));
      // await sleep(20);
      let res = true;
      if (callApi) {
        res = await this.updateBigComProducts(payload);
      }
      if (res) {
        updatedProducts = updatedProducts.concat(dataRow);
        //   await Promise.allSettled(
        //     dataRow.map((d) => {
        //       return updateProduct(d.id, {
        //         price: d.price,
        //         retail_price: d.retail_price,
        //         cost_price: d.cost_price,
        //         ...(d.new_sale_price !== null
        //           ? { sale_price: d.new_sale_price }
        //           : {}),
        //       });
        //     })
        //   );
      }
      // console.log("[dataRow]", dataRow);
      bar1.increment();
    }
    bar1.stop();
    ////////
    let ufilename = `bc_price_updated_products`; //+new Date().getTime();
    // filename = `uhp_prods_1679411095707`;
    let ufilePath = path.resolve("download-files", `${ufilename}.json`);

    ////json file ////////
    fs.writeFileSync(ufilePath, JSON.stringify(updatedProducts));

    ////csv file ////////
    let cvsfilename = `bc_price_updated_products`; //+new Date().getTime
    let csvfilePath = path.resolve("download-files", `${cvsfilename}.csv`);
    const csv = await converter.json2csv(updatedProducts);
    !!csv.trim() && fs.writeFileSync(csvfilePath, csv);

    // if (!isDev) {
    //   !!csv.trim() && sendMail(csvfilePath);
    // }
    // console.log(csv,!!csv.trim())
    //////////
    //////

    let filename = `bc_log_products`;
    // filename = `uhp_prods_1679411095707`;
    let filePath = path.resolve("download-files", `${filename}.json`);

    ////json file ////////
    fs.writeFileSync(filePath, JSON.stringify(errors));
    //////////
  }
  console.log("Success");
};

exports.updateBC_SKU_barcode_paired = async () => {
  console.log("Fetching all products.....");
  let limit = 1;

  // let products = await readCSVFile(
  //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/update_sku.csv"
  // );

  let products = getFailedProducts([]);

  // products = products.filter((d) => d.status == "Y");
  console.log(
    products.length
    // products,
    //  products.map((d) => (d.bc_sku)).join(" | ")
  );
  // return;
  let updatedProducts = [];
  let nonUpdatedProducts = [];
  fs.writeFileSync(filePath, ``);
  if (products) {
    let dataChunks = lodash.chunk(products, limit);
    let totalChunks = dataChunks.length;
    bar1.start(totalChunks, 0);
    for (let i = 0; i < totalChunks; i++) {
      let dataRow = [];

      for (const d of dataChunks[i]) {
        let pdata = await getProductByOBBarcodeMatched(d.product_id);
        if (pdata) {
          dataRow.push({
            //id: d.id,
            id: d.product_id,
            //  sku: `OB - ${d.oborne_sku}`,
            /////for failed
            sku: d.sku,
            ///////
            bc_sku: pdata.sku,
            ob_sku: pdata.ob_sku,
            upc: pdata.upc,
            barcode: pdata.barcode,
            //name: d.bc_name,
          });
        } else {
          nonUpdatedProducts.push(d);
        }
      }
      //  dataChunks[i]
      //     .map((d) => {
      //       // let ct = JSON.parse(d.categories);

      //       return {
      //         //id: d.id,
      //         id: d.product_id,
      //         sku: d.oborne_sku,
      //         name: d.bc_name,
      //         barcode: d.upc,
      //       };
      //     })
      // .filter(Boolean);
      // console.log("dataRow dataRow", dataRow.length);
      // await sleep(20);
      if (dataRow.length) {
        let payload = dataRow.map((d) => ({
          id: d.id,
          sku: d.sku,
        }));
        // console.log("payload", payload.length);
        // let res = await this.updateBigComProducts(payload);
        // if (res) {
        updatedProducts = updatedProducts.concat(dataRow);
        // await Promise.allSettled(
        //   dataRow.map((d) => {
        //     return updateProduct(d.id, {
        //       inventory_level: d.inventory_level,
        //     });
        //   })
        // );
        // }
      }
      // console.log("[dataRow]", dataRow);
      bar1.increment();
    }

    bar1.stop();
    ////////

    ////json file ////////
    let ufilename = `bc_sku_updated_product`; //+new Date().getTime();
    let ufilePath = path.resolve("download-files", `${ufilename}.json`);
    fs.writeFileSync(ufilePath, JSON.stringify(updatedProducts));

    ////csv file ////////
    let cvsfilename = `bc_sku_updated_product`; //+new Date().getTime
    let csvfilePath = path.resolve("download-files", `${cvsfilename}.csv`);
    const csv = await converter.json2csv(updatedProducts);
    !!csv.trim() && fs.writeFileSync(csvfilePath, csv);

    ////////////NON UPDATED////////
    let noncvsfilename = `bc_sku_not_updated_product`; //+new Date().getTime
    let noncsvfilePath = path.resolve(
      "download-files",
      `${noncvsfilename}.csv`
    );
    const noncsv = await converter.json2csv(nonUpdatedProducts);
    fs.writeFileSync(noncsvfilePath, noncsv);

    // if (!isDev) {
    //   !!csv.trim() && sendMail(csvfilePath);
    // }
    // console.log(csv,!!csv.trim())
    //////////
    //////

    let filename = `bc_log_products`;
    // filename = `uhp_prods_1679411095707`;
    let filePath = path.resolve("download-files", `${filename}.json`);

    ////json file ////////
    fs.writeFileSync(filePath, JSON.stringify(errors));
    //////////
  }
  console.log("Success");
};

exports.getDuplicateProducts = async () => {
  let products = await getAllBCProducts("*");
  console.log("products ", products.length);
  products = products.map((d) => {
    let { product_id, sku, name, categories, inventory_level, ...rest } = d;
    let [sup_code, ...sku_code] = sku.split("-");

    sup_code = (sup_code || "").trim();
    sku_code = (sku_code || []).join("-").trim();
    if (!sku_code) {
      sku_code = sup_code;
      sup_code = "";
    }

    return {
      product_id,
      bc_sku: sku,
      sku: sku_code,
      sup_code,
      name,
      categories,
      inventory_level,
      ...rest,
    };
  });
  let groupByProducts = lodash.groupBy(products, (d) => {
    return d.sku;
  });

  // await writeCSVFile("duplicate_produts", products);
  // console.log("groupByProducts ", groupByProducts);
  // writeJsonFile("duplicate_produts", groupByProducts);
  let arrayProducts = Object.values(groupByProducts).filter((d) => {
    return d.length > 1;
  });
  // writeJsonFile("duplicate_produts_1", arrayProducts);
  //
  let pp = arrayProducts.reduce((r, d) => {
    let empty = Object.keys(d[0]).reduce((kk, k) => {
      return { ...kk, [k]: "" };
    }, {});
    // let dd = d.concat([empty]);

    return [...r, ...d, empty];
  }, []);
  await writeCSVFile("duplicate_produts_1", pp);
  console.log("--Success-- ");
};
function getBarcodePairedProductsSQL(fields = "*") {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      `SELECT bc_products.product_id,oborne_products.sku as ob_sku,bc_products.sku as bc_sku,oborne_products.barcode,bc_products.gtin,bc_products.upc,bc_products.name,oborne_products.name as ob_name,oborne_products.availability,bc_products.inventory_level FROM bc_products left JOIN oborne_products on oborne_products.barcode =bc_products.gtin and CONCAT_WS(" - ", "OB",oborne_products.sku) !=bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.gtin!='N/A' and bc_products.sku LIKE 'OB - %';`
    );

    r(results);
  });
}
exports.getBarcodePairedProducts = async () => {
  let products = await getBarcodePairedProductsSQL();
  console.log("products ", products.length);

  products = products.map((d) => {
    let {
      product_id,
      ob_sku,
      bc_sku,
      barcode,
      gtin,
      upc,
      name,
      ob_name,
      availability,
      inventory_level,
    } = d;

    let [sup_code, ...bc_sku_code] = bc_sku.split("-");

    sup_code = (sup_code || "").trim();
    bc_sku_code = (bc_sku_code || []).join("-").trim();
    return {
      product_id,
      ob_sku,
      bc_sku_code,
      bc_sku,
      barcode,
      gtin,
      upc,
      ob_name,
      name,

      // availability,
      //inventory_level,
    };
  });
  let filter_products = [];
  let not_find_products = [];
  let query = getMySqlQuery();
  bar1.start(products.length, 0);
  for (const p of products) {
    let results = await query("SELECT * FROM oborne_products WHERE sku = ?", [
      p.bc_sku_code,
    ]);
    let isExist = !!results.length;
    let results1 = await query("SELECT * FROM bc_products WHERE sku = ?", [
      `OB - ${p.ob_sku}`,
    ]);

    let isExist1 = !!results1.length;
    if (isExist && isExist1) {
      filter_products.push(p);
    } else {
      not_find_products.push(p);
    }
    bar1.increment();
  }
  bar1.stop();
  console.log("filter_products ", filter_products.length);
  console.log("not_find_products ", not_find_products.length);
  await writeCSVFile("barcode_paired_SKU_EXIST", filter_products);
  await writeCSVFile("barcode_paired", not_find_products);
  console.log("--Success-- ");
};

let score_keys = [
  "factualityaccuracy",
  "evidencebasedclaims",
  "transparencydisclosure",
  "clarityreadability",
  "engagementtone",
  "structurelayout",
  "visualhierarchy",
  "imagerymultimedia",
  "accessibility",
  "overalleffectiveness",
  "alignmentwithtargetaudience",
  "trustcredibility",
  "completeness",
  "searchfunctionality",
  "internallinking",
  "calltoactionclarity",
  "disclaimer",
];
function insertScore(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM bc_ai_score WHERE product_id = ?",
      [d.product_id]
    );
    let isExist = !!results.length;
    let fields = `product_id=?,ai_text=?,${score_keys
      .map((r) => `${r}=?`)
      .join()}`;
    let sql = isExist
      ? `UPDATE bc_ai_score SET ${fields} where product_id=?`
      : `INSERT INTO bc_ai_score SET ${fields}`;

    let result1 = await query(sql, [
      d.product_id,
      d.ai_text,
      d.factualityaccuracy,
      d.evidencebasedclaims,
      d.transparencydisclosure,
      d.clarityreadability,
      d.engagementtone,
      d.structurelayout,
      d.visualhierarchy,
      d.imagerymultimedia,
      d.accessibility,
      d.overalleffectiveness,
      d.alignmentwithtargetaudience,
      d.trustcredibility,
      d.completeness,
      d.searchfunctionality,
      d.internallinking,
      d.calltoactionclarity,
      d.disclaimer,
      ...(isExist ? [d.product_id] : []),
    ]).catch((err) => {
      console.log(d.product_id, isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}

exports.fetchScoreBCProducts = () => {
  return new Promise(async (r) => {
    console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>[fetchScoreBCProducts] BC----");
    console.time("fscorebc");
    let query = getMySqlQuery();
    let results = await query(
      `SELECT bc_products.product_id,description,ai_text FROM bc_products left join  bc_ai_score on bc_ai_score.product_id=bc_products.product_id WHERE description!='' and ai_text IS NULL`
    );
    // results = results.slice(3042 + 245 + 938);

    console.log(results, results.length);
    return;
    let len = results.length;
    bar1.start(len, 0);
    let inc = 1;
    for (const data of results) {
      let aiText = await runBardGetDescriptionScore(data.description);
      let score = getScoreJSON(aiText);

      let insertdata = score_keys.reduce((s, d) => {
        return { ...s, [d]: score[d]?.no ?? -1 };
      }, {});
      insertdata.ai_text = aiText;
      insertdata.product_id = data.product_id;
      await insertScore(insertdata);

      // console.log(score, insertdata);
      console.log("[fetchScoreBCProducts] progess- ", inc++, "/", len);
      bar1.increment();
    }
    bar1.stop();
    console.log("Success - [fetchScoreBCProducts]");
    console.timeEnd("fscorebc");
    r(results);
  });
};
function insertScoreImp(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM bc_improved_ai_score WHERE product_id = ?",
      [d.product_id]
    );
    let isExist = !!results.length;
    let fields = `product_id=?,ai_text=?,${score_keys
      .map((r) => `${r}=?`)
      .join()}`;
    let sql = isExist
      ? `UPDATE bc_improved_ai_score SET ${fields} where product_id=?`
      : `INSERT INTO bc_improved_ai_score SET ${fields}`;

    let result1 = await query(sql, [
      d.product_id,
      d.ai_text,
      d.factualityaccuracy,
      d.evidencebasedclaims,
      d.transparencydisclosure,
      d.clarityreadability,
      d.engagementtone,
      d.structurelayout,
      d.visualhierarchy,
      d.imagerymultimedia,
      d.accessibility,
      d.overalleffectiveness,
      d.alignmentwithtargetaudience,
      d.trustcredibility,
      d.completeness,
      d.searchfunctionality,
      d.internallinking,
      d.calltoactionclarity,
      d.disclaimer,
      ...(isExist ? [d.product_id] : []),
    ]).catch((err) => {
      console.log(d.product_id, isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}
exports.fetchScoreBCProductsImproved = (description, product_id) => {
  return new Promise(async (r) => {
    console.log(
      "---->>>>>>>>>>>>>>>>>>>>>>>>>>>[fetchScoreBCProductsImproved] BC----"
    );

    let aiText = await runBardGetDescriptionScore(description);
    let score = getScoreJSON(aiText);

    let insertdata = score_keys.reduce((s, d) => {
      return { ...s, [d]: score[d]?.no ?? -1 };
    }, {});
    insertdata.ai_text = aiText;
    insertdata.product_id = product_id;
    await insertScoreImp(insertdata);

    r(insertdata);
  });
};
function insertScoreImpCat(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM bc_cat_improved_ai_score WHERE id = ?",
      [d.id]
    );
    let isExist = !!results.length;
    let fields = `id=?,ai_text=?,${score_keys.map((r) => `${r}=?`).join()}`;
    let sql = isExist
      ? `UPDATE bc_cat_improved_ai_score SET ${fields} where id=?`
      : `INSERT INTO bc_cat_improved_ai_score SET ${fields}`;

    let result1 = await query(sql, [
      d.id,
      d.ai_text,
      d.factualityaccuracy,
      d.evidencebasedclaims,
      d.transparencydisclosure,
      d.clarityreadability,
      d.engagementtone,
      d.structurelayout,
      d.visualhierarchy,
      d.imagerymultimedia,
      d.accessibility,
      d.overalleffectiveness,
      d.alignmentwithtargetaudience,
      d.trustcredibility,
      d.completeness,
      d.searchfunctionality,
      d.internallinking,
      d.calltoactionclarity,
      d.disclaimer,
      ...(isExist ? [d.id] : []),
    ]).catch((err) => {
      console.log(d.id, isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}
exports.fetchScoreBCCatImproved = (description, id) => {
  return new Promise(async (r) => {
    console.log(
      "---->>>>>>>>>>>>>>>>>>>>>>>>>>>[fetchScoreBCCatImproved] BC----"
    );

    let aiText = await runBardGetCatScore(description);
    let score = getScoreJSON(aiText);

    let insertdata = score_keys.reduce((s, d) => {
      return { ...s, [d]: score[d]?.no ?? -1 };
    }, {});
    insertdata.ai_text = aiText;
    insertdata.id = id;
    await insertScoreImpCat(insertdata);

    r(insertdata);
  });
};
////
function insertScoreImpBlog(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM bc_blog_improved_ai_score WHERE id = ?",
      [d.id]
    );
    let isExist = !!results.length;
    let fields = `id=?,ai_text=?,${score_keys.map((r) => `${r}=?`).join()}`;
    let sql = isExist
      ? `UPDATE bc_blog_improved_ai_score SET ${fields} where id=?`
      : `INSERT INTO bc_blog_improved_ai_score SET ${fields}`;

    let result1 = await query(sql, [
      d.id,
      d.ai_text,
      d.factualityaccuracy,
      d.evidencebasedclaims,
      d.transparencydisclosure,
      d.clarityreadability,
      d.engagementtone,
      d.structurelayout,
      d.visualhierarchy,
      d.imagerymultimedia,
      d.accessibility,
      d.overalleffectiveness,
      d.alignmentwithtargetaudience,
      d.trustcredibility,
      d.completeness,
      d.searchfunctionality,
      d.internallinking,
      d.calltoactionclarity,
      d.disclaimer,
      ...(isExist ? [d.id] : []),
    ]).catch((err) => {
      console.log(d.id, isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}
exports.fetchScoreBCBlogImproved = (description, id) => {
  return new Promise(async (r) => {
    console.log(
      "---->>>>>>>>>>>>>>>>>>>>>>>>>>>[fetchScoreBCBlogImproved] BC----"
    );

    let aiText = await runBardGetBlogScore(description);
    let score = getScoreJSON(aiText);

    let insertdata = score_keys.reduce((s, d) => {
      return { ...s, [d]: score[d]?.no ?? -1 };
    }, {});
    insertdata.ai_text = aiText;
    insertdata.id = id;
    await insertScoreImpBlog(insertdata);

    r(insertdata);
  });
};

exports.fetchScoreBCCatProducts = () => {
  return new Promise(async (r) => {
    console.log(
      "---->>>>>>>>>>>>>>>>>>>>>>>>>>>[fetchScoreBCCatProducts] BC----"
    );
    console.time("fetchScoreBCCatProducts");
    let exFilePath = path.resolve("download-files", `bc_categories.json`);
    let results = fs.readFileSync(exFilePath).toString();
    results = JSON.parse(results);
    results = results.filter((d) => !!d.description);
    console.log(results.length);
    // return;
    let len = results.length;
    bar1.start(len, 0);
    let inc = 1;
    for (const data of results) {
      let query = getMySqlQuery();
      let result = await query(
        `SELECT id,ai_text FROM bc_cat_improved_ai_score WHERE id=?`,
        [data.id]
      );

      result = result?.[0];
      if (!result?.ai_text) {
        let aiText = await runBardGetCatImpDescription(data.description);
        let insertData = await insertImpCatDescription(data.id, aiText);

        let score = await this.fetchScoreBCCatImproved(aiText, data.id);
      }

      // console.log(score, insertdata);
      console.log("[fetchScoreBCCatProducts] progess- ", inc++, "/", len);
      bar1.increment();
    }
    bar1.stop();
    console.log("Success - [fetchScoreBCCatProducts]");
    console.timeEnd("fetchScoreBCCatProducts");
    r(results);
  });
};

async function insertImpCatDescription(id, description) {
  let query = getMySqlQuery();
  let results = await query(
    "SELECT * FROM bc_cat_improved_ai_score WHERE id = ?",
    [id]
  );
  let isExist = !!results.length;
  let fields = `id=?,improved_description=?,fetch_at=?`;
  let sql = isExist
    ? `UPDATE bc_cat_improved_ai_score SET ${fields} where id=?`
    : `INSERT INTO bc_cat_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    id,
    description,
    date,
    ...(isExist ? [id] : []),
  ]).catch((err) => {
    console.log(id, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}
exports.insertImpCatDescription = insertImpCatDescription;

function getNonListedProducts(searchKey) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = ``;
    let products = [];
    if (searchKey == "OB") {
      ///////////////////////////////////////////////
      /////OB
      sql = `SELECT oborne_products.*,bc_products.sku as bc_sku, "OB" as search_key FROM oborne_products left join bc_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE bc_products.sku IS NULL;`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts Non Listed]", err.sqlMessage);
      });
      console.log("OB ->", result?.length);
      if (result) products = products.concat(result);
    }
    if (searchKey == "UHP") {
      /////UHP
      sql = `SELECT uhp_products.*,bc_products.sku as bc_sku, "UHP" as search_key FROM uhp_products left join bc_products on CONCAT_WS(" - ", "UN",uhp_products.sku) =bc_products.sku WHERE bc_products.sku IS NULL;`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts Non Listed]", err.sqlMessage);
      });
      console.log("UHP ->", result?.length);
      if (result) products = products.concat(result);
    }
    if (searchKey == "KAD") {
      /////kadac_products
      sql = `SELECT kadac_products.*,bc_products.sku as bc_sku, "KAD" as search_key FROM kadac_products left join bc_products on CONCAT_WS(" - ", "KAD",kadac_products.sku) =bc_products.sku WHERE bc_products.sku IS NULL;`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts Non Listed]", err.sqlMessage);
      });
      console.log("kadac_products ->", result?.length);
      if (result) products = products.concat(result);
    }
    if (searchKey == "GBN") {
      /////globalnature_products
      sql = `SELECT globalnature_products.*,bc_products.sku as bc_sku, "GBN" as search_key FROM globalnature_products left join bc_products on CONCAT_WS(" - ", "GBN",globalnature_products.sku) =bc_products.sku WHERE bc_products.sku IS NULL;`;
      result = await query(sql).catch((err) => {
        console.log("[getProducts Non Listed]", err.sqlMessage);
      });
      console.log("globalnature_products ->", result?.length);
      if (result) products = products.concat(result);
    }
    if (searchKey == "KIK") {
      /////kik_products
      sql = `SELECT kik_products.*,bc_products.sku as bc_sku, "KIK" as search_key FROM kik_products left join bc_products on CONCAT_WS(" - ", "KIK",kik_products.sku) =bc_products.sku WHERE bc_products.sku IS NULL
           UNION ALL
           SELECT kik_products.*,bc_products.sku as bc_sku, "KIK" as search_key FROM kik_products left join bc_products on kik_products.sku =bc_products.sku WHERE bc_products.sku IS NULL;
           `;
      result = await query(sql).catch((err) => {
        console.log("[getProducts Non Listed]", err.sqlMessage);
      });
      console.log("kik_products ->", result?.length);
      result = _.uniqBy(result, "sku");
      if (result) products = products.concat(result);
    }
    r(products);
  });
}
exports.getNonListedProducts = getNonListedProducts;

exports.insertBigComProducts = async (data, showLog = false) => {
  // console.log("Fetching metadata.....");

  let res = await bigCommerce.post(`/catalog/products`, data).catch((err) => {
    console.log("[insertBigComProducts] error", err);

    // fs.appendFileSync(filePath, `\n................................\n`);
    ////json file ////////
    // fs.appendFileSync(filePath, JSON.stringify({ data, err }));
    //////////
    // errors.push({ data, err });
  });
  showLog && console.log(res);
  return res;
  // console.log(res);

  // console.log("Success");
};

function getOBMatchProducts() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = ``;
    let products = [];
    ///////////////////////////////////////////////
    ////////////////////////////////////////////
    ///ob product
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability,bc_products.inventory_level, oborne_products.sku,oborne_products.new_sku,bc_products.name,bc_products.sku as bc_sku,CONCAT_WS(" - ", "OB",oborne_products.sku) as s1,"OB" as keyword,bc_products.availability as bc_availability,oborne_products.rrp,oborne_products.ws_ex_gst FROM bc_products 
    left JOIN oborne_products on CONCAT_WS(" - ", "OB",oborne_products.sku) =bc_products.sku WHERE oborne_products.id IS NOT NULL;`;

    let result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob product", result?.length);
    if (result) products = products.concat(result);

    //ob colon product
    sql = `SELECT bc_products.id,bc_products.product_id,oborne_products.availability, oborne_products.sku,oborne_products.new_sku,bc_products.name,bc_products.sku as bc_sku,bc_products.inventory_level,CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) as s1,SUBSTRING_INDEX(oborne_products.sku, ": ", -1) as s2,"OB-colon" as keyword ,bc_products.availability as bc_availability,oborne_products.rrp,oborne_products.ws_ex_gst FROM bc_products left JOIN oborne_products on CONCAT_WS(" - ", "OB", SUBSTRING_INDEX(oborne_products.sku, ": ", -1)) =bc_products.sku WHERE oborne_products.id IS NOT NULL and POSITION(":" IN oborne_products.sku);`;

    result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob colon product", result?.length);
    if (result) products = products.concat(result);

    let finalProducts = products;

    r(finalProducts);
  });
}

exports.updateObSku = async () => {
  let obproducts = await getOBMatchProducts();
  return obproducts;
};

function getBCOBProducts() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let sql = ``;
    let products = [];
    ///////////////////////////////////////////////
    ////////////////////////////////////////////
    ///ob product
    sql = `SELECT * FROM bc_products WHERE sku LIKE 'OB - %';`;

    let result = await query(sql).catch((err) => {
      console.log("[getProducts]", err.sqlMessage);
    });
    console.log("ob product", result?.length);
    if (result) products = products.concat(result);

    let finalProducts = products;

    r(finalProducts);
  });
}
exports.bigCNotListObSku = async () => {
  let obproducts = await getBCOBProducts();
  return obproducts;
};

function insertOrder(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("SELECT * FROM bc_orders WHERE order_id = ?", [
      d.id,
    ]);
    let isExist = !!results.length;
    let fields = `order_id=?,customer_id=?,first_name=?,last_name=?,phone=?,email=?,	date_created=?,	date_modified	=?,date_shipped	=?,status_id=?,	status=?,	items_total=?,	items	=?,subtotal_inc_tax	=?,shipping_cost_inc_tax=?,	handling_cost_inc_tax	=?,total_inc_tax=?`;
    let sql = isExist
      ? `UPDATE bc_orders SET ${fields} where order_id=?`
      : `INSERT INTO bc_orders SET ${fields}`;

    let items = JSON.stringify(
      (d.consignments?.[0]?.shipping?.[0]?.line_items || []).map((r) => {
        return {
          product_id: r.product_id,
          name: r.name,
          sku: r.sku,
          quantity: r.quantity,
          total_inc_tax: r.total_inc_tax,
          price_inc_tax: r.price_inc_tax,
        };
      })
    );
    // console.log(d.consignments?.[0]?.shipping)
    let result1 = await query(sql, [
      d.id,
      d.customer_id,
      d.billing_address?.first_name || "",
      d.billing_address?.last_name || "",
      d.billing_address?.phone || "",
      d.billing_address?.email || "",
      d.date_created
        ? moment(d.date_created).format("YYYY-MM-DD HH:mm:ss")
        : null,
      d.date_modified
        ? moment(d.date_modified).format("YYYY-MM-DD HH:mm:ss")
        : null,
      d.date_shipped
        ? moment(d.date_shipped).format("YYYY-MM-DD HH:mm:ss")
        : null,

      d.status_id,
      d.status,
      d.items_total,
      items,
      d.subtotal_inc_tax,
      d.shipping_cost_inc_tax,
      d.handling_cost_inc_tax,
      d.total_inc_tax,

      ...(isExist ? [d.id] : []),
    ]).catch((err) => {
      console.log(d.id, isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }

    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}

exports.getBCOrders = async (truncate = true) => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 250;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  let count = await bigCommerceV2.get(`/orders/count`).catch(console.log);

  let total_pages = Math.ceil(count.count / limit);
  // console.log(
  //   "count",
  //   count.count,
  //   count.count / limit,
  //   Math.ceil(count.count / limit),
  //   total_pages
  // );
  // writeJsonFile("bc-orders-count", count);

  // let metaData = await bigCommerceV2
  //   .get(`/orders?limit=${limit}&page=1&include=consignments.line_items`)
  //   .catch(console.log);
  // console.log(metaData?.[0]?.id,metaData?.[metaData?.length-1]?.id);
  // writeJsonFile('bc-orders',metaData)
  // // if (metaData) {
  // // let total_pages = metaData.meta.pagination.total_pages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
  let offsetPage = readJsonFile("bc-order-last-page-no") || 1;
  console.log("total_pages:", total_pages, offsetPage);
  // return
  bar1.start(total_pages, offsetPage - 1);
  let cats = [];
  for (let j = offsetPage || 1; j <= total_pages; j++) {
    // console.log("pages", i, total_pages);
    let res = await bigCommerceV2
      .get(`/orders?limit=${limit}&page=${j}&include=consignments.line_items`)
      .catch(console.log);
    if (res) {
      cats = cats.concat(res);
      // console.log(res?.[0]?.id, res?.[res?.length - 1]?.id);
      // let total_items = res.length;

      // let filename = `bc_${limit}_${j}_${new Date().getTime()}`;
      // // filename = `uhp_prods_1679411095707`;
      // let jsonFilePath = path.resolve("download-files", `${filename}.json`);
      ////json file ////////
      //fs.writeFileSync(jsonFilePath, JSON.stringify(res.data));
      //////////
      let dataChunks = lodash.chunk(res, 50);
      let totalChunks = dataChunks.length;

      for (let i = 0; i < totalChunks; i++) {
        let dataRow = dataChunks[i];

        // dataRow.forEach((row) => {
        //   // console.log(row.id);

        // })
        await Promise.allSettled(
          dataRow.map((row) => {
            return insertOrder(row);
          })
        );
      }

      writeJsonFile("bc-order-last-page-no", j);
    }
    bar1.increment();
  }
  ////////
  // let ufilename = `bc_orders`; //+new Date().getTime();
  // filename = `uhp_prods_1679411095707`;
  // let ufilePath = path.resolve("download-files", `${ufilename}.json`);

  ////json file ////////
  // fs.writeFileSync(ufilePath, JSON.stringify(cats));
  // }
  bar1.stop();

  console.log("Success");
};

exports.BCPhoneUpdate = async () => {
  let query = getMySqlQuery();
  let results = await query(
    `SELECT id,phone,updated_phone FROM bc_orders where phone!='' and updated_phone is null`
  );
  results = results.filter((p) => {
    let phone = p.phone;
    return (
      phone.startsWith("4") ||
      phone.startsWith("04") ||
      phone.startsWith("61")||
      phone.startsWith("+61")
    );
  });

  results = results.map((p) => {
    let updated_phone = p.phone.replace(/ |-/g, "");
    if (updated_phone.startsWith("4") || updated_phone.startsWith("04")) {
      if (updated_phone.startsWith("04")) {
        updated_phone = updated_phone.slice(1);
      }
      if (updated_phone.length == 9) {
        updated_phone = `+61${updated_phone}`;
      }
    }
    return { ...p, updated_phone: updated_phone };
  });

  let count = 0,
    total = results.length;
  for (const element of results) {
    await query("update bc_orders set updated_phone=? WHERE id = ?", [
      element.updated_phone,
      element.id,
    ]);
    console.log(`updated:- ${++count}/${total}`);
  }

  writeJsonFile("phones", results);
  console.log(results.length);
  return results;
};

exports.BCCustomerPhoneVerifyUpdate = async () => {
  let query = getMySqlQuery();
  let results = await query(
    `SELECT updated_phone FROM bc_orders where updated_phone is not null and phone_valid is null GROUP by updated_phone;`
  );
  let i = 0;
  let total = results.length;
  for (const row of results) {
    const resp = await axios
      .get(
        `http://apilayer.net/api/validate?access_key=6ad98716a1d5ea748d97820a06857be6&number=${row.updated_phone}&format=1`
      )
      .catch((err) => {
        console.log("ERROR", err);
      });

    // console.log(resp?.data);
    let data = resp?.data;
    let phone_valid = null;
    if (data?.number) {
      phone_valid = data?.valid ? "valid" : "invalid";
    }
    await query(
      `UPDATE  bc_orders set phone_valid=?,numverify_json=?  where updated_phone =?`,
      [phone_valid, JSON.stringify(data), row.updated_phone]
    );
    console.log("progress--", ++i, "/", total);
    await sleep(800);
  }

  // writeJsonFile("phones", results);
  console.log("Success");
  return results;
};
