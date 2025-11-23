const { getMySqlQuery } = require("../config/mysql");
const {
  runBard,
  runBardGetImpDescription,
  runBardGetCatImpDescription,
  runBardGetBlogImpDescription,
  runBardGeUHPImpDescription,
} = require("../heplers/bard-ai.helpers");
const {
  getBigComProducts,
  getBCCategories,
  updateBigComProducts,
  fetchScoreBCProductsImproved,
  getBCBlogs,
  fetchScoreBCCatImproved,
  updateBigComCategory,
  fetchScoreBCBlogImproved,
  updateBigComBlog,
  insertImpCatDescription,
  getNonListedProducts,
  addBigComProducts,
  insertBigCommerceProduct,
  BCPhoneUpdate,
  BCCustomerPhoneVerifyUpdate,
} = require("../heplers/big-commerce.helper");
const {
  getOBProducts,
  getUHPProducts,
  getKadacProducts,
  getGlobalnatureProducts,
  getKIKProductsFromDB,
} = require("../model/util.model");
const commonModel = require("../model/common.model");
const { render } = require("../util/view.util");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const { sleep, readJsonFile, writeJsonFile } = require("../util/app.util");
const { result } = require("lodash");
const {
  getKIKBillofMaterials,
  getKIKStocks,
  getKIKSalesInvoices,
  getBillOfMaterialStockAnalysis,
  getKIKProducts,
  getBillOfMaterialStockOnHand,
  getBillOfMaterialAnalysis,
  getBillOfMaterialStockNeeds,
  shopifyTeelixirPhoneUpdate,
  shopifyCustomerPhoneVerifyUpdate,
  getKIKSalesOrders,
} = require("../heplers/kik.helpers");
const {
  getOborneStockData,
  getOborneStockDataBySkU,
} = require("../heplers/oborne.helper");
let query = getMySqlQuery();
let existFields = [
  "id",
  "product_id",
  "name",
  "type",
  "sku",
  "weight",
  "width",
  "depth",
  "height",
  "price",
  "cost_price",
  "retail_price",
  "sale_price",
  "map_price",
  "tax_class_id",
  "product_tax_code",
  "calculated_price",
  "categories",
  "brand_id",
  "option_set_id",
  "option_set_display",
  "inventory_level",
  "inventory_warning_level",
  "inventory_tracking",
  "reviews_rating_sum",
  "reviews_count",
  "total_sold",
  "fixed_cost_shipping_price",
  "is_free_shipping",
  "is_visible",
  "is_featured",
  "related_products",
  "warranty",
  "bin_picking_number",
  "layout_file",
  "upc",
  "mpn",
  "gtin",
  "search_keywords",
  "availability",
  "availability_description",
  "gift_wrapping_options_type",
  "gift_wrapping_options_list",
  "sort_order",
  "_condition",
  "is_condition_shown",
  "order_quantity_minimum",
  "order_quantity_maximum",
  "page_title",
  "meta_keywords",
  "meta_description",
  "description",
  "date_created",
  "date_modified",
  "base_variant_id",
  "ai_text",
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
exports.getBigCommerceCategories = async (req, res, next) => {
  let exFilePath = path.resolve("download-files", `bc_categories.json`);
  let bc_categories = fs.readFileSync(exFilePath).toString();
  bc_categories = JSON.parse(bc_categories);

  let results = bc_categories.reduce((r, d) => {
    let { id, name, parent_id, page_title, meta_keywords } = d;
    return { ...r, [id]: { name, parent_id, page_title, meta_keywords } };
  }, {});

  res.json({
    status: true,
    message: "",
    data: results,
  });
};
exports.updateBigCommerceCatBulk = async (req, res, next) => {
  let { ids } = req.body;
  let result = [];
  let exFilePath = path.resolve("download-files", `bc_categories.json`);
  let bc_categories = fs.readFileSync(exFilePath).toString();
  bc_categories = JSON.parse(bc_categories);

  if (ids.length) {
    for (const id of ids) {
      let results = await query(
        "SELECT * FROM bc_cat_improved_ai_score WHERE id = ?",
        [id]
      );

      let row = results?.[0];
      let dd = {};
      if (row) {
        let description = row.improved_description;
        dd = {
          id: row.id,
        };
        let r = await updateBigComCategory(id, { description: description });

        bc_categories = bc_categories.map((c) => {
          if (c.id == id) {
            return { ...c, description };
          }
          return c;
        });

        let date = moment().format("YYYY-MM-DD HH:mm:ss");
        await query(
          "Update  bc_cat_improved_ai_score set update_at=? WHERE id = ?",
          [date, id]
        );

        ////json file ////////
        fs.writeFileSync(exFilePath, JSON.stringify(bc_categories));

        dd.update_at = date;
      }
      result.push(dd);
    }
  }
  res.json({
    status: true,
    message: "",
    data: result,
  });
};

exports.getBigCommerceCategoriesList = async (req, res, next) => {
  let { id } = req.query;

  let exFilePath = path.resolve("download-files", `bc_categories.json`);
  let bc_categories = fs.readFileSync(exFilePath).toString();
  bc_categories = JSON.parse(bc_categories);
  let impData = null;
  //  let list=[...bc_categories];
  if (id) {
    bc_categories = bc_categories.find((r) => {
      return r.id == id;
    });
    let r1 = await query(`SELECT * FROM bc_cat_improved_ai_score where id=?`, [
      id,
    ]);
    impData = r1?.[0];
    // console.log(bc_categories)
  } else {
    let score = await query(`SELECT * FROM bc_cat_improved_ai_score`);

    bc_categories = bc_categories.map((r) => {
      let s = score.find((s) => s.id == r.id);
      // console.log(s,score)
      let d = {
        ...r,
        factualityaccuracy: null,
        evidencebasedclaims: null,
        transparencydisclosure: null,
        clarityreadability: null,
        engagementtone: null,
        structurelayout: null,
        visualhierarchy: null,
        imagerymultimedia: null,
        accessibility: null,
        overalleffectiveness: null,
        alignmentwithtargetaudience: null,
        trustcredibility: null,
        completeness: null,
        searchfunctionality: null,
        internallinking: null,
        calltoactionclarity: null,
        disclaimer: null,
        fetch_at: null,
        update_at: null,
        ...s,
        des_char_count: s?.improved_description?.length || 0,
      };
      delete d.description;
      delete d.meta_description;
      delete d.improved_description;
      delete d.ai_text;

      return d;
    });
  }

  res.json({
    status: true,
    message: "",
    data: bc_categories,
    imp_data: impData,
  });
};

exports.getBigCommerceProducts = async (req, res, next) => {
  let { fields = "*", id } = req.query;

  fields = fields
    .split(",")
    .filter((f) => existFields.includes(f))
    .join(",")
    .replace(/product_id/g, "bc_products.product_id");
  let results = await (id
    ? query(
        `SELECT *,bc_products.product_id as product_id  FROM bc_products left join bc_ai_score on bc_products.product_id=bc_ai_score.product_id where id=?`,
        [id]
      )
    : query(
        `SELECT ${
          fields || "*"
        } FROM bc_products left join bc_ai_score on bc_products.product_id=bc_ai_score.product_id`
      ));

  let impData = null;

  if (id && results?.[0]) {
    let dd = results?.[0];
    let r1 = await query(
      `SELECT * FROM bc_improved_ai_score where product_id=?`,
      [dd.product_id]
    );
    impData = r1?.[0];
  }

  res.json({
    status: true,
    message: "",
    data: id ? results?.[0] : results, //.slice(0, 25),
    imp_data: impData,
  });
};

exports.getBigCommerceProductsImp = async (req, res, next) => {
  let { fields = "*", id } = req.query;

  fields = fields
    .split(",")
    .filter((f) => [...existFields, "fetch_at", "update_at"].includes(f))
    .join(",")
    .replace(/product_id/g, "bc_products.product_id");
  let results = await (id
    ? query(
        `SELECT *,bc_products.product_id as product_id  FROM bc_products left join bc_improved_ai_score on bc_products.product_id=bc_improved_ai_score.product_id where id=?`,
        [id]
      )
    : query(
        `SELECT 
        ${
          ""
          // fields || "*"
        }
        id,bc_products.product_id,sku,name,
        fetch_at,update_at,
        
        CHAR_LENGTH(bc_improved_ai_score.improved_description) as des_char_count ,
        ${[
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
        ]
          .map((s) => `bc_ai_score.${s} as old_${s}`)
          .join(",")},
        ${[
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
        ]
          .map((s) => `bc_improved_ai_score.${s} as imp_${s}`)
          .join(",")}
        FROM bc_products left join bc_improved_ai_score on bc_products.product_id=bc_improved_ai_score.product_id
        left join bc_ai_score on bc_products.product_id=bc_ai_score.product_id
        
        `
      ));

  let impData = null;

  res.json({
    status: true,
    message: "",
    data: id ? results?.[0] : results, //.slice(0, 25),
  });
};
exports.loadBigCommerceProducts = async (req, res, next) => {
  await getBCCategories();
  await getBigComProducts();
  res.json({
    status: true,
    message: "",
  });
};

exports.loadBigCommerceCategory = async (req, res, next) => {
  await getBCCategories();
  res.json({
    status: true,
    message: "",
  });
};
exports.getUHPProducts = async (req, res, next) => {
  let results = await query(`SELECT * FROM uhp_products`);
  res.json({
    status: true,
    message: "",
    data: results,
  });
};
exports.getOborneProducts = async (req, res, next) => {
  let results = await query(`SELECT * FROM oborne_products`);
  res.json({
    status: true,
    message: "",
    data: results,
  });
};

exports.getKadacProducts = async (req, res, next) => {
  let results = await query(`SELECT * FROM kadac_products`);
  res.json({
    status: true,
    message: "",
    data: results,
  });
};

exports.getGlobalNatureProducts = async (req, res, next) => {
  let results = await query(`SELECT * FROM globalnature_products`);
  res.json({
    status: true,
    message: "",
    data: results,
  });
};

exports.getKIK_Products = async (req, res, next) => {
  let results = await query(`SELECT * FROM kik_products`);
  res.json({
    status: true,
    message: "",
    data: results,
  });
};
exports.getCrons = async (req, res, next) => {
  let results = await query(
    `SELECT *, DATE_FORMAT(date_time, "%d-%b-%Y %h:%i %p") as date_time_formatted FROM crons`
  );
  res.json({
    status: true,
    message: "",
    data: results,
  });
};

exports.getAllProducts = async (req, res, next) => {
  let bc_fields = `bc_products.categories`;

  //  let ob = await getOBProducts(bc_fields);

  // let uhp = await getUHPProducts(bc_fields);

  // let kadac = await getKadacProducts(bc_fields);

  let globalnature = await getGlobalnatureProducts(bc_fields);

  let kik = await getKIKProductsFromDB(bc_fields);

  let results = [].concat(
    // ob,
    // uhp,
    // kadac,
    globalnature,
    kik
  );
  res.json({
    status: true,
    message: "",
    data: results,
  });
};

exports.getTextGoogleAI = async (req, res, next) => {
  let { question } = req.body;
  let r = await runBard(question);

  res.json({
    status: true,
    message: "",
    data: r,
  });
};
exports.updateBigCommerceProduct = async (req, res, next) => {
  let { product_id, description } = req.body;
  let r = await updateBigComProducts(
    [{ id: product_id, description: description }],
    true
  );
  let query = getMySqlQuery();
  let results = await query(
    "Update  bc_products set description=? WHERE product_id = ?",
    [description, product_id]
  );
  res.json({
    status: true,
    message: "",
    data: r,
  });
};

exports.updateBigCommerceProductBulk = async (req, res, next) => {
  let { product_ids } = req.body;
  let result = [];
  if (product_ids.length) {
    for (const product_id of product_ids) {
      let results = await query(
        "SELECT * FROM bc_improved_ai_score WHERE product_id = ?",
        [product_id]
      );

      let row = results?.[0];
      let dd = {};
      if (row) {
        let description = row.improved_description;
        dd = {
          product_id: row.product_id,
        };
        let r = await updateBigComProducts(
          [{ id: product_id, description: description }],
          true
        );
        // console.log('updateBigComProducts',r);
        await query(
          "Update  bc_products set description=? WHERE product_id = ?",
          [description, product_id]
        );
        let date = moment().format("YYYY-MM-DD HH:mm:ss");
        await query(
          "Update  bc_improved_ai_score set update_at=? WHERE product_id = ?",
          [date, product_id]
        );
        dd.update_at = date;
      }
      result.push(dd);
    }
  }
  res.json({
    status: true,
    message: "",
    data: result,
  });
};

exports.getImpScore = async (req, res, next) => {
  let { product_id } = req.body;

  let results = await query(
    `SELECT * FROM bc_improved_ai_score where product_id=?`,
    [product_id]
  );
  if (!results.length) {
    res.json({
      status: false,
      message: "Data Not Found",
    });
    return;
  }
  let row = results?.[0];
  let data = await fetchScoreBCProductsImproved(
    row.improved_description,
    row.product_id
  );

  res.json({
    status: true,
    message: "",
    data: data,
  });
};

async function insertImpDescription(product_id, description) {
  let results = await query(
    "SELECT * FROM bc_improved_ai_score WHERE product_id = ?",
    [product_id]
  );
  let isExist = !!results.length;
  let fields = `product_id=?,improved_description=?,fetch_at=?`;
  let sql = isExist
    ? `UPDATE bc_improved_ai_score SET ${fields} where product_id=?`
    : `INSERT INTO bc_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    product_id,
    description,
    date,
    ...(isExist ? [product_id] : []),
  ]).catch((err) => {
    console.log(product_id, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}

exports.saveImpDesc = async (req, res, next) => {
  let { product_id, description, update_score } = req.body;

  await insertImpDescription(product_id, description);
  let data = null;
  if (update_score) {
    if (description) {
      data = await fetchScoreBCProductsImproved(description, product_id);
    }
  }

  res.json({
    status: true,
    message: "Success",
    data: data,
  });
};

exports.getImpDesc = async (req, res, next) => {
  let { product_id } = req.body;

  let results = await query("SELECT * FROM bc_products WHERE product_id = ?", [
    product_id,
  ]);

  if (!results?.length) {
    res.json({
      status: false,
      message: "No data",
      data: results,
    });
    return;
  }
  let row = results[0];

  let scoresRold = await query(
    "SELECT * FROM bc_ai_score WHERE product_id = ?",
    [product_id]
  );
  scoresRold = scoresRold?.[0] || {};
  let scoresR = await query(
    "SELECT * FROM bc_improved_ai_score WHERE product_id = ?",
    [product_id]
  );

  scoresR = scoresR?.[0] || null;

  if (!scoresR) {
    scoresR = scoresRold;
  }

  let new_description = await runBardGetImpDescription(
    row.description,
    scoresR
  );
  await insertImpDescription(row.product_id, new_description);
  res.json({
    status: true,
    message: "Success",
    data: new_description,
  });
};
const sendData = (res, data) => {
  // console.log(data);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  res.flush();
};
exports.getImpDescBulk = async (req, res, next) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  req.on("close", () => {
    console.log("disconnected");
  });

  let { product_ids } = req.query;
  product_ids = (product_ids || "")?.split(",");
  let result = [];
  let total = product_ids.length;
  let inc = 0;
  // console.log(product_ids);

  if (product_ids.length) {
    for (const product_id of product_ids) {
      let results = await query(
        "SELECT * FROM bc_products WHERE product_id = ?",
        [product_id]
      );

      let row = results?.[0];
      let dd = {};
      if (row) {
        dd = {
          id: row.id,
          product_id: row.product_id,
          name: row.name,
          sku: row.sku,
        };

        let scoresRold = await query(
          "SELECT * FROM bc_ai_score WHERE product_id = ?",
          [row.product_id]
        );
        scoresRold = scoresRold?.[0] || {};
        let scoresR = await query(
          "SELECT * FROM bc_improved_ai_score WHERE product_id = ?",
          [row.product_id]
        );

        scoresR = scoresR?.[0] || null;

        if (!scoresR) {
          scoresR = scoresRold;
        }

        let new_description = await runBardGetImpDescription(
          row.description,
          scoresR
        );
        let insertData = await insertImpDescription(
          row.product_id,
          new_description
        );
        // if (new_description) {
        // let data = await fetchScoreBCProductsImproved(
        //   new_description,
        //   row.product_id
        // );
        // dd.score = { ...data, fetch_at: insertData.fetch_at };
        // }
        dd.score = { fetch_at: insertData.fetch_at };
        //dd.new_description = new_description;
      }
      result.push(dd);
      sendData(res, { type: "progress", total, progress: ++inc });
    }
  }
  sendData(res, { type: "success", result });
  res.end();
  // res.json({
  //   status: true,
  //   message: "Success",
  //   data: result,
  // });
};

exports.saveImpCat = async (req, res, next) => {
  let { id, description, update_score } = req.body;

  await insertImpCatDescription(id, description);
  let data = null;
  if (update_score) {
    if (description) {
      data = await fetchScoreBCCatImproved(description, id);
    }
  }
  res.json({
    status: true,
    message: "Success",
    data: data,
  });
};
exports.getCatImpDescBulk = async (req, res, next) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  req.on("close", () => {
    console.log("disconnected");
  });

  let { ids } = req.query;
  ids = (ids || "")?.split(",");

  let result = [];
  let total = ids.length;
  let inc = 0;
  if (ids.length) {
    for (const id of ids) {
      let exFilePath = path.resolve("download-files", `bc_categories.json`);
      let bc_categories = fs.readFileSync(exFilePath).toString();
      bc_categories = JSON.parse(bc_categories);

      //  let list=[...bc_categories];

      row = bc_categories.find((r) => {
        return r.id == id;
      });
      // console.log(bc_categories)

      let dd = {};
      if (row) {
        dd = {
          id: row.id,
        };

        let scoresR = await query(
          "SELECT * FROM bc_cat_improved_ai_score WHERE id = ?",
          [row.id]
        );

        scoresR = scoresR?.[0] || {};

        let new_description = await runBardGetCatImpDescription(
          row.description,
          scoresR
        );
        let insertData = await insertImpCatDescription(row.id, new_description);
        // if (new_description) {
        //   let data = await fetchScoreBCCatImproved(new_description, row.id);
        //   dd.score = { ...data, fetch_at: insertData.fetch_at };
        // }
        dd.score = { fetch_at: insertData.fetch_at };

        // dd.new_description = new_description;
      }
      result.push(dd);
      sendData(res, { type: "progress", total, progress: ++inc });
    }
  }
  sendData(res, { type: "success", result });
  res.end();
  // res.json({
  //   status: true,
  //   message: "Success",
  //   data: result,
  // });
};

exports.getSetting = async (req, res, next) => {
  let code = req.params.code;
  let results = await commonModel.getAll("settings", "*", `where code=?`, [
    code,
  ]);

  res.json({
    status: true,
    message: "",
    data: results.reduce((d, r) => {
      return { ...d, [r.prop]: JSON.parse(r.value) };
    }, {}),
  });
};

exports.addSetting = async (req, res, next) => {
  let code = req.params.code;
  let { prop, value } = req.body;
  let results = await commonModel.getAll(
    "settings",
    "*",
    `where code=? and prop=?`,
    [code, prop]
  );
  let exist = !!results.length;

  let result = await commonModel
    .insertOrUpdate(
      "settings",
      { code, prop, value: JSON.stringify(value) },
      exist ? "where code=? and prop=?" : "",
      exist ? [code, prop] : null
    )
    .catch((err) => {
      res.json({
        status: false,
        message: err.message,
      });
    });

  if (result) {
    res.json({
      status: true,
      message: exist ? "Updated Successfully." : "Added Successfully.",
      data: result,
    });
  }
};

exports.loadBigCommerceBlog = async (req, res, next) => {
  await getBCBlogs();
  res.json({
    status: true,
    message: "",
  });
};
exports.getBigCommerceBlogs = async (req, res, next) => {
  let { id } = req.query;

  let exFilePath = path.resolve("download-files", `bc_blogs.json`);
  let list = fs.readFileSync(exFilePath).toString();
  list = JSON.parse(list);
  let impData = null;
  //  let list=[...list];
  if (id) {
    list = list.find((r) => {
      return r.id == id;
    });
    let r1 = await query(`SELECT * FROM bc_blog_improved_ai_score where id=?`, [
      id,
    ]);
    impData = r1?.[0];
    // console.log(list)
  } else {
    let score = await query(`SELECT * FROM bc_blog_improved_ai_score`);

    list = list.map((r) => {
      let s = score.find((s) => s.id == r.id);
      // console.log(s,score)
      let d = {
        ...r,
        factualityaccuracy: null,
        evidencebasedclaims: null,
        transparencydisclosure: null,
        clarityreadability: null,
        engagementtone: null,
        structurelayout: null,
        visualhierarchy: null,
        imagerymultimedia: null,
        accessibility: null,
        overalleffectiveness: null,
        alignmentwithtargetaudience: null,
        trustcredibility: null,
        completeness: null,
        searchfunctionality: null,
        internallinking: null,
        calltoactionclarity: null,
        disclaimer: null,
        fetch_at: null,
        update_at: null,
        ...s,
        des_char_count: s?.improved_description?.length || 0,
      };
      delete d.body;

      delete d.improved_description;
      delete d.ai_text;

      return d;
    });
  }

  res.json({
    status: true,
    message: "",
    data: list,
    imp_data: impData,
  });
};
async function insertImpBlogDescription(id, description) {
  let results = await query(
    "SELECT * FROM bc_blog_improved_ai_score WHERE id = ?",
    [id]
  );
  let isExist = !!results.length;
  let fields = `id=?,improved_description=?,fetch_at=?`;
  let sql = isExist
    ? `UPDATE bc_blog_improved_ai_score SET ${fields} where id=?`
    : `INSERT INTO bc_blog_improved_ai_score SET ${fields}`;
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

exports.saveImpBlog = async (req, res, next) => {
  let { id, description } = req.body;

  await insertImpBlogDescription(id, description);

  res.json({
    status: true,
    message: "Success",
    data: "",
  });
};

exports.getBlogImpDescBulk = async (req, res, next) => {
  let { ids } = req.body;
  let result = [];
  if (ids.length) {
    for (const id of ids) {
      let exFilePath = path.resolve("download-files", `bc_blogs.json`);
      let list = fs.readFileSync(exFilePath).toString();
      list = JSON.parse(list);

      //  let list=[...list];

      row = list.find((r) => {
        return r.id == id;
      });
      // console.log(list)

      let dd = {};
      if (row) {
        dd = {
          id: row.id,
        };

        let scoresR = await query(
          "SELECT * FROM bc_blog_improved_ai_score WHERE id = ?",
          [row.id]
        );

        scoresR = scoresR?.[0] || {};

        let new_description = await runBardGetBlogImpDescription(
          row.description,
          scoresR
        );
        let insertData = await insertImpBlogDescription(
          row.id,
          new_description
        );
        if (new_description) {
          let data = await fetchScoreBCBlogImproved(new_description, row.id);
          dd.score = { ...data, fetch_at: insertData.fetch_at };
        }
        // dd.new_description = new_description;
      }
      result.push(dd);
    }
  }
  res.json({
    status: true,
    message: "Success",
    data: result,
  });
};

exports.updateBigCommerceBlogBulk = async (req, res, next) => {
  let { ids } = req.body;
  let result = [];
  let exFilePath = path.resolve("download-files", `bc_blogs.json`);
  let list = fs.readFileSync(exFilePath).toString();
  list = JSON.parse(list);

  if (ids.length) {
    for (const id of ids) {
      let results = await query(
        "SELECT * FROM bc_blog_improved_ai_score WHERE id = ?",
        [id]
      );

      let row = results?.[0];
      let dd = {};
      if (row) {
        let description = row.improved_description;
        dd = {
          id: row.id,
        };
        let r = await updateBigComBlog([{ id: id, body: description }], true);

        list = list.map((c) => {
          if (c.id == id) {
            return { ...c, body: description };
          }
          return c;
        });

        let date = moment().format("YYYY-MM-DD HH:mm:ss");
        await query(
          "Update  bc_blog_improved_ai_score set update_at=? WHERE id = ?",
          [date, id]
        );

        ////json file ////////
        fs.writeFileSync(exFilePath, JSON.stringify(list));

        dd.update_at = date;
      }
      result.push(dd);
    }
  }
  res.json({
    status: true,
    message: "",
    data: result,
  });
};

// getOBProducts()

exports.getNotListedProducts = async (req, res, next) => {
  let { searchKey = "UHP" } = req.query;

  let data = await getNonListedProducts(searchKey);

  res.json({
    status: true,
    message: "",
    data: data,
  });
};
function getTableName(searchKey) {
  switch (searchKey) {
    case "UHP":
      return "uhp_products";
  }
}
exports.insertBigCommerceBulk = async (req, res, next) => {
  let { sku, searchKey } = req.body;

  let tableName = getTableName(searchKey);
  sql = `SELECT * from  ${tableName} where sku=?`;
  let result = await query(sql, [sku[0]]).catch((err) => {
    console.log("[getProducts Non Listed]", err.sqlMessage);
  });
  result = result?.[0];

  let bc_payload = {};

  if (result) {
    bc_payload = {
      //required
      name: result.description,
      price: result.description,
      type: "physical",
      weight: result.ctn_weight,
      ////////
      sku: `UN - ${result.sku}`,
      description: result.ingredients,
      width: 9999999999,
      depth: 9999999999,
      height: 9999999999,

      cost_price: 0.1,
      retail_price: 0.1,
      sale_price: 0.1,
      map_price: 0,
      tax_class_id: 255,
      product_tax_code: "string",
      categories: [0],
      brand_id: 1000000000,
      brand_name: "Common Good",
      inventory_level: 2147483647,
      inventory_warning_level: 2147483647,
      inventory_tracking: "none",
      fixed_cost_shipping_price: 0.1,
      is_free_shipping: true,
      is_visible: true,
      is_featured: true,
      related_products: [0],
      warranty: "string",
      bin_picking_number: "string",
      layout_file: "string",
      upc: "string",
      search_keywords: "string",
      availability_description: "string",
      availability: "available",
      gift_wrapping_options_type: "any",
      gift_wrapping_options_list: [0],
      sort_order: -2147483648,
      condition: "New",
      is_condition_shown: true,
      order_quantity_minimum: 1000000000,
      order_quantity_maximum: 1000000000,
      page_title: "string",
      meta_keywords: ["string"],
      meta_description: "string",
      view_count: 1000000000,
      preorder_release_date: "2019-08-24T14:15:22Z",
      preorder_message: "string",
      is_preorder_only: true,
      is_price_hidden: true,
      price_hidden_label: "string",
      custom_url: {
        url: "string",
        is_customized: true,
      },
      open_graph_type: "product",
      open_graph_title: "string",
      open_graph_description: "string",
      open_graph_use_meta_description: true,
      open_graph_use_product_name: true,
      open_graph_use_image: true,
      gtin: "string",
      mpn: "string",
      reviews_rating_sum: 3,
      reviews_count: 4,
      total_sold: 80,
      custom_fields: [
        {
          id: 6,
          name: "ISBN",
          value: "1234567890123",
        },
      ],
      bulk_pricing_rules: [
        {
          quantity_min: 10,
          quantity_max: 50,
          type: "price",
          amount: 10,
        },
      ],
      images: [
        {
          image_file: "string",
          is_thumbnail: true,
          sort_order: -2147483648,
          description: "string",
          image_url: "string",
          id: 0,
          product_id: 0,
          date_modified: "2019-08-24T14:15:22Z",
        },
      ],
      videos: [
        {
          title: "Writing Great Documentation",
          description: "A video about documenation",
          sort_order: 1,
          type: "youtube",
          video_id: "z3fRu9pkuXE",
          id: 0,
          product_id: 0,
          length: "string",
        },
      ],
      variants: [
        {
          cost_price: 0.1,
          price: 0.1,
          sale_price: 0.1,
          retail_price: 0.1,
          weight: 0.1,
          width: 0.1,
          height: 0.1,
          depth: 0.1,
          is_free_shipping: true,
          fixed_cost_shipping_price: 0.1,
          purchasing_disabled: true,
          purchasing_disabled_message: "string",
          upc: "string",
          inventory_level: 2147483647,
          inventory_warning_level: 2147483647,
          bin_picking_number: "string",
          mpn: "string",
          gtin: "012345678905",
          product_id: 0,
          sku: "string",
          option_values: [
            {
              option_display_name: "Color",
              label: "Beige",
            },
          ],
          calculated_price: 0.1,
          calculated_weight: 0,
        },
      ],
    };
  }

  res.json({
    status: true,
    message: "",
    data: result,
    bc_payload,
  });
};

exports.getUHPImpDesc = async (req, res, next) => {
  let { sku } = req.query;

  let results = await query(
    "SELECT * FROM uhp_improved_ai_score WHERE sku = ?",
    [sku]
  );

  let row = results?.[0];

  res.json({
    status: !!row,
    message: "Success",
    data: row,
  });
};

exports.generateUHPImpDesc = async (req, res, next) => {
  let { sku } = req.body;

  let results = await query("SELECT * FROM uhp_products WHERE sku = ?", [sku]);

  if (!results?.length) {
    res.json({
      status: false,
      message: "No data",
      data: results,
    });
    return;
  }
  let row = results[0];

  let scoresR = await query(
    "SELECT * FROM uhp_improved_ai_score WHERE sku = ?",
    [sku]
  );

  scoresR = scoresR?.[0] || null;

  let new_description = await runBardGeUHPImpDescription(
    `${row.description}\n${row.ingredients}`,
    scoresR
  );
  await insertUHPImpDescription(row.sku, new_description);
  res.json({
    status: true,
    message: "Success",
    data: new_description,
  });
};

async function insertUHPImpDescription(sku, description) {
  let results = await query(
    "SELECT * FROM uhp_improved_ai_score WHERE sku = ?",
    [sku]
  );
  let isExist = !!results.length;
  let fields = `sku=?,improved_description=?,fetch_at=?`;

  let sql = isExist
    ? `UPDATE uhp_improved_ai_score SET ${fields} where sku=?`
    : `INSERT INTO uhp_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    sku,
    description,
    date,

    ...(isExist ? [sku] : []),
  ]).catch((err) => {
    console.log(sku, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}

exports.getOBImpDesc = async (req, res, next) => {
  let { sku } = req.query;

  let results = await query(
    "SELECT * FROM ob_improved_ai_score WHERE sku = ?",
    [sku]
  );

  let row = results?.[0];

  res.json({
    status: !!row,
    message: "Success",
    data: row,
  });
};

exports.generateOBImpDesc = async (req, res, next) => {
  let { sku } = req.body;

  let results = await query("SELECT * FROM oborne_products WHERE sku = ?", [
    sku,
  ]);

  if (!results?.length) {
    res.json({
      status: false,
      message: "No data",
      data: results,
    });
    return;
  }
  let row = results[0];

  let scoresR = await query(
    "SELECT * FROM ob_improved_ai_score WHERE sku = ?",
    [sku]
  );

  scoresR = scoresR?.[0] || null;

  let new_description = await runBardGeUHPImpDescription(
    `${row.name}`,
    scoresR
  );
  await insertOBImpDescription(row.sku, new_description);
  res.json({
    status: true,
    message: "Success",
    data: new_description,
  });
};

async function insertOBImpDescription(sku, description) {
  let results = await query(
    "SELECT * FROM ob_improved_ai_score WHERE sku = ?",
    [sku]
  );
  let isExist = !!results.length;
  let fields = `sku=?,improved_description=?,fetch_at=?`;

  let sql = isExist
    ? `UPDATE ob_improved_ai_score SET ${fields} where sku=?`
    : `INSERT INTO ob_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    sku,
    description,
    date,

    ...(isExist ? [sku] : []),
  ]).catch((err) => {
    console.log(sku, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}

exports.getKADImpDesc = async (req, res, next) => {
  let { sku } = req.query;

  let results = await query(
    "SELECT * FROM kad_improved_ai_score WHERE sku = ?",
    [sku]
  );

  let row = results?.[0];

  res.json({
    status: !!row,
    message: "Success",
    data: row,
  });
};

exports.generateKADImpDesc = async (req, res, next) => {
  let { sku } = req.body;

  let results = await query("SELECT * FROM kadac_products WHERE sku = ?", [
    sku,
  ]);

  if (!results?.length) {
    res.json({
      status: false,
      message: "No data",
      data: results,
    });
    return;
  }
  let row = results[0];

  let scoresR = await query(
    "SELECT * FROM kad_improved_ai_score WHERE sku = ?",
    [sku]
  );

  scoresR = scoresR?.[0] || null;

  let new_description = await runBardGeUHPImpDescription(
    `${row.description}`,
    scoresR
  );
  await insertKADImpDescription(row.sku, new_description);
  res.json({
    status: true,
    message: "Success",
    data: new_description,
  });
};

async function insertKADImpDescription(sku, description) {
  let results = await query(
    "SELECT * FROM kad_improved_ai_score WHERE sku = ?",
    [sku]
  );
  let isExist = !!results.length;
  let fields = `sku=?,improved_description=?,fetch_at=?`;

  let sql = isExist
    ? `UPDATE kad_improved_ai_score SET ${fields} where sku=?`
    : `INSERT INTO kad_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    sku,
    description,
    date,

    ...(isExist ? [sku] : []),
  ]).catch((err) => {
    console.log(sku, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}

exports.getGBNImpDesc = async (req, res, next) => {
  let { sku } = req.query;

  let results = await query(
    "SELECT * FROM gbn_improved_ai_score WHERE sku = ?",
    [sku]
  );

  let row = results?.[0];

  res.json({
    status: !!row,
    message: "Success",
    data: row,
  });
};

exports.generateGBNImpDesc = async (req, res, next) => {
  let { sku } = req.body;

  let results = await query(
    "SELECT * FROM globalnature_products WHERE sku = ?",
    [sku]
  );

  if (!results?.length) {
    res.json({
      status: false,
      message: "No data",
      data: results,
    });
    return;
  }
  let row = results[0];

  let scoresR = await query(
    "SELECT * FROM gbn_improved_ai_score WHERE sku = ?",
    [sku]
  );

  scoresR = scoresR?.[0] || null;

  let new_description = await runBardGeUHPImpDescription(
    `${row.description}`,
    scoresR
  );
  await insertGBNImpDescription(row.sku, new_description);
  res.json({
    status: true,
    message: "Success",
    data: new_description,
  });
};

async function insertGBNImpDescription(sku, description) {
  let results = await query(
    "SELECT * FROM gbn_improved_ai_score WHERE sku = ?",
    [sku]
  );
  let isExist = !!results.length;
  let fields = `sku=?,improved_description=?,fetch_at=?`;

  let sql = isExist
    ? `UPDATE gbn_improved_ai_score SET ${fields} where sku=?`
    : `INSERT INTO gbn_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    sku,
    description,
    date,

    ...(isExist ? [sku] : []),
  ]).catch((err) => {
    console.log(sku, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}

exports.getKIKImpDesc = async (req, res, next) => {
  let { sku } = req.query;

  let results = await query(
    "SELECT * FROM kik_improved_ai_score WHERE sku = ?",
    [sku]
  );

  let row = results?.[0];

  res.json({
    status: !!row,
    message: "Success",
    data: row,
  });
};

exports.generateKIKImpDesc = async (req, res, next) => {
  let { sku } = req.body;

  let results = await query("SELECT * FROM kik_products WHERE sku = ?", [sku]);

  if (!results?.length) {
    res.json({
      status: false,
      message: "No data",
      data: results,
    });
    return;
  }
  let row = results[0];

  let scoresR = await query(
    "SELECT * FROM kik_improved_ai_score WHERE sku = ?",
    [sku]
  );

  scoresR = scoresR?.[0] || null;

  let new_description = await runBardGeUHPImpDescription(
    `${row.ProductDescription}`,
    scoresR
  );
  await insertKIKImpDescription(row.sku, new_description);
  res.json({
    status: true,
    message: "Success",
    data: new_description,
  });
};

async function insertKIKImpDescription(sku, description) {
  let results = await query(
    "SELECT * FROM kik_improved_ai_score WHERE sku = ?",
    [sku]
  );
  let isExist = !!results.length;
  let fields = `sku=?,improved_description=?,fetch_at=?`;

  let sql = isExist
    ? `UPDATE kik_improved_ai_score SET ${fields} where sku=?`
    : `INSERT INTO kik_improved_ai_score SET ${fields}`;
  let date = moment().format("YYYY-MM-DD HH:mm:ss");
  let result1 = await query(sql, [
    sku,
    description,
    date,

    ...(isExist ? [sku] : []),
  ]).catch((err) => {
    console.log(sku, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  if (result1) {
    // console.log("products", index + 1, total_products);
  }
  return { fetch_at: date };
}

exports.addToBC = async (req, res, next) => {
  let {
    searchKey,
    brand,
    sku,
    barcode,
    name,
    price,
    weight,
    category,
    description,
    cost_price,
    images = [],
    meta_description,
  } = req.body;
  let code = "UN";
  let _sku = `${code} - ${sku}`;
  if (searchKey == "OB") {
    code = "OB";
    `${code} - ${sku}`;
    _sku = `${code} - ${sku}`;
  } else if (searchKey == "KAD") {
    code = "KAD";
    _sku = `${code} - ${sku}`;
  } else if (searchKey == "GBN") {
    code = "GBN";
    _sku = `${code} - ${sku}`;
  } else if (searchKey == "KIK") {
    code = "KIK";
    if (sku.startsWith("KIK - ")) {
      _sku = `${sku}`;
    } else {
      _sku = `${code} - ${sku}`;
    }
  }
  let payload = {
    sku: _sku,
    categories: category.map((d) => parseFloat(d)),
    name: `${name || ""}`,
    type: "physical",
    description: `${description || ""}`,
    weight: parseFloat(weight || 0),
    price: parseFloat(price || 0),
    cost_price: parseFloat(cost_price || 0),
    upc: `${barcode || ""}`,
    gtin: `${barcode || ""}`,
    images: images,
    brand_name: `${brand || ""}`,
    meta_description: `${meta_description || ""}`,
  };
  let results = await addBigComProducts(payload).catch((error) => {
    console.log("add to bc erro", error);
    res.json({
      status: false,
      message: "Failed",
      error,
    });
  });
  // let results = {
  //   data: {
  //     id: 61853,
  //     name: "Amazonia Raw Gentle Digest Paleo Protein Chocolate 1kg",
  //     type: "physical",
  //     sku: "UN - AC190",
  //     description:
  //       '<h2>Raw Gentle Digest Paleo Protein Chocolate</h2><p>Fuel your body with our Raw Gentle Digest Paleo Protein Chocolate! Our unique blend of organic ingredients offers a soothing solution for a healthy digestive system while providing essential protein for optimal nourishment.</p><h3>Key Benefits:</h3><ul><li><strong>Aids Digestion:</strong> Fermented pea and sprouted quinoa provide prebiotics and probiotics, promoting a healthy gut microbiome.</li><li><strong>Nourishing Protein:</strong> Packed with pea protein, alfalfa grass, and pumpkin seeds, it delivers a complete spectrum of essential amino acids.</li><li><strong>Rich in Antioxidants:</strong> Spinach, spirulina, and chia seeds offer an abundance of antioxidants, protecting cells from damage.</li></ul><h3>Unique Features:</h3><ul><li><strong>Organic Fermented Blend:</strong> Our fermented pea protein empowers your digestive system with beneficial bacteria.</li><li><strong>Paleo-Friendly:</strong> Compliant with the Paleo diet, this protein powder is free from grains, dairy, and legumes.</li><li><strong>Easy to Digest:</strong> Gentle on the stomach, it\'s suitable for those with sensitive digestive systems.</li></ul><h3>How to Use:</h3><p>Simply mix 2 scoops (30g) with 300-400ml of plant-based milk or water. Enjoy as a smoothie, protein shake, or added to your favorite recipes.</p><p><strong>Caution:</strong> As with any dietary supplement, consult your healthcare professional before use, especially if you have any underlying health conditions. Do not exceed recommended dosage.</p><h3>Call to Action:</h3><p>Enhance your well-being with the power of Raw Gentle Digest Paleo Protein Chocolate! Order now and experience the benefits of a healthy digestive system and optimal nutrition.</p><p><a href="#">Buy Now</a></p>',
  //     weight: 1.18,
  //     width: 0,
  //     depth: 0,
  //     height: 0,
  //     price: 75.95,
  //     cost_price: 0,
  //     retail_price: 0,
  //     sale_price: 0,
  //     map_price: 0,
  //     tax_class_id: 0,
  //     product_tax_code: "",
  //     calculated_price: 75.95,
  //     categories: [504],
  //     brand_id: 73,
  //     option_set_id: null,
  //     option_set_display: "right",
  //     inventory_level: 0,
  //     inventory_warning_level: 0,
  //     inventory_tracking: "none",
  //     reviews_rating_sum: 0,
  //     reviews_count: 0,
  //     total_sold: 0,
  //     fixed_cost_shipping_price: 0,
  //     is_free_shipping: false,
  //     is_visible: true,
  //     is_featured: false,
  //     related_products: [-1],
  //     warranty: "",
  //     bin_picking_number: "",
  //     layout_file: "",
  //     upc: "9344060003498",
  //     mpn: "",
  //     gtin: "9344060003498",
  //     date_last_imported: null,
  //     search_keywords: "",
  //     availability: "available",
  //     availability_description: "",
  //     gift_wrapping_options_type: "any",
  //     gift_wrapping_options_list: [],
  //     sort_order: 0,
  //     condition: "New",
  //     is_condition_shown: false,
  //     order_quantity_minimum: 0,
  //     order_quantity_maximum: 0,
  //     page_title: "",
  //     meta_keywords: [],
  //     meta_description: "",
  //     date_created: "2024-05-27T17:08:40+00:00",
  //     date_modified: "2024-05-27T17:08:40+00:00",
  //     view_count: 0,
  //     preorder_release_date: null,
  //     preorder_message: "",
  //     is_preorder_only: false,
  //     is_price_hidden: false,
  //     price_hidden_label: "",
  //     custom_url: {
  //       url: "/amazonia-raw-gentle-digest-paleo-protein-chocolate-1kg/",
  //       is_customized: false,
  //     },
  //     base_variant_id: 59599,
  //     open_graph_type: "product",
  //     open_graph_title: "",
  //     open_graph_description: "",
  //     open_graph_use_meta_description: true,
  //     open_graph_use_product_name: true,
  //     open_graph_use_image: true,
  //     variants: [
  //       {
  //         id: 59599,
  //         product_id: 61853,
  //         sku: "UN - AC190",
  //         sku_id: null,
  //         price: 75.95,
  //         calculated_price: 75.95,
  //         sale_price: 0,
  //         retail_price: 0,
  //         map_price: 0,
  //         weight: 1.18,
  //         width: 0,
  //         height: 0,
  //         depth: 0,
  //         is_free_shipping: false,
  //         fixed_cost_shipping_price: 0,
  //         calculated_weight: 1.18,
  //         purchasing_disabled: false,
  //         purchasing_disabled_message: "",
  //         image_url: "",
  //         cost_price: 0,
  //         upc: "9344060003498",
  //         mpn: "",
  //         gtin: "9344060003498",
  //         inventory_level: 0,
  //         inventory_warning_level: 0,
  //         bin_picking_number: "",
  //         option_values: [],
  //       },
  //     ],
  //     images: [],
  //     primary_image: null,
  //     videos: [],
  //     custom_fields: [],
  //     bulk_pricing_rules: [],
  //     reviews: [],
  //     options: [],
  //     modifiers: [],
  //     parent_relations: [],
  //   },
  //   meta: {},
  // };
  if (results) {
    if (results?.data) {
      insertBigCommerceProduct(results.data);
    }
    if (searchKey == "UHP") {
      await insertUHPImpDescription(sku, description);

      await query("update uhp_products set is_added=? WHERE sku = ?", [1, sku]);
    } else if (searchKey == "OB") {
      await insertOBImpDescription(sku, description);

      await query("update oborne_products set is_added=? WHERE sku = ?", [
        1,
        sku,
      ]);
    } else if (searchKey == "KAD") {
      await insertKADImpDescription(sku, description);

      await query("update kadac_products set is_added=? WHERE sku = ?", [
        1,
        sku,
      ]);
    } else if (searchKey == "GBN") {
      await insertGBNImpDescription(sku, description);

      await query("update globalnature_products set is_added=? WHERE sku = ?", [
        1,
        sku,
      ]);
    } else if (searchKey == "KIK") {
      await insertKIKImpDescription(sku, description);

      await query("update kik_products set is_added=? WHERE sku = ?", [1, sku]);
    }
    res.json({
      status: true,
      message: "Success",
      data: results,
      payload,
    });
  }
};

exports.loadTeelixirData = async (req, res, next) => {
  await getKIKProducts(true, true);
  await getKIKStocks(true, true);
  await getKIKBillofMaterials(true, true);
  await getKIKSalesInvoices(true);
  await getKIKSalesOrders(true);
  res.json({
    status: true,
    message: "",
  });
};

exports.teelixirStockAnalysis = async (req, res, next) => {
  let { days, from, to, product_group } = req.query;

  let data = await getBillOfMaterialStockAnalysis(from, to);
  console.log("product_group", product_group);
  if (product_group) {
    if (product_group == "evr-else") {
      data = data.filter(
        (s) =>
          !["Raw Materials", "Packaging Materials", "Obsolete"].includes(
            s.ProductGroup_edited || s.ProductGroup
          )
      );
    } else {
      data = data.filter(
        (s) => (s.ProductGroup_edited || s.ProductGroup) == product_group
      );
    }
  }

  res.json({
    status: true,
    data,
    message: "",
  });
};

exports.teelixirStockOnHand = async (req, res, next) => {
  let { days, from, to, product_group } = req.query;

  let data = await getBillOfMaterialStockOnHand(from, to);
  console.log("product_group", product_group);
  if (product_group) {
    if (product_group == "evr-else") {
      data = data.filter(
        (s) =>
          !["Raw Materials", "Packaging Materials", "Obsolete"].includes(
            s.ProductGroup
          )
      );
    } else {
      data = data.filter((s) => s.ProductGroup == product_group);
    }
  }

  res.json({
    status: true,
    data,
    message: "",
  });
};

exports.teelixirUpdateRevisedCost = async (req, res, next) => {
  let { productCode, revisedCost } = req.body;

  let query = getMySqlQuery();
  let results = await query(
    "SELECT * FROM teelixir_stock_on_hand WHERE product_code = ?",
    [productCode]
  );
  let isExist = !!results.length;
  let fields = `product_code=?,revised_cost=?`;
  let sql = isExist
    ? `UPDATE teelixir_stock_on_hand SET ${fields} where product_code=?`
    : `INSERT INTO teelixir_stock_on_hand SET ${fields}`;

  let result1 = await query(sql, [
    productCode,
    revisedCost,

    ...(isExist ? [productCode] : []),
  ]).catch((err) => {
    console.log(productCode, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  res.json({
    status: true,
    message: "Updated",
  });
};
exports.teelixirUpdateProductGroup = async (req, res, next) => {
  let { productCode, productGroup } = req.body;

  let query = getMySqlQuery();
  let results = await query(
    "SELECT * FROM teelixir_stock_on_hand WHERE product_code = ?",
    [productCode]
  );
  let isExist = !!results.length;
  let fields = `product_code=?,product_group=?`;
  let sql = isExist
    ? `UPDATE teelixir_stock_on_hand SET ${fields} where product_code=?`
    : `INSERT INTO teelixir_stock_on_hand SET ${fields}`;

  let result1 = await query(sql, [
    productCode,
    productGroup,

    ...(isExist ? [productCode] : []),
  ]).catch((err) => {
    console.log(productCode, isExist, err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  res.json({
    status: true,
    message: "Updated",
  });
};
async function getTeelixirBillOfMaterialsData(from, to, product_group) {
  let data = await getBillOfMaterialAnalysis(from, to);

  // console.log("product_group", from, to, product_group);
  if (product_group) {
    if (product_group == "evr-else") {
      data = data.filter(
        (s) =>
          !["Raw Materials", "Packaging Materials", "Obsolete"].includes(
            s.ProductGroup_edited || s.ProductGroup
          )
      );
    } else {
      data = data.filter(
        (s) => (s.ProductGroup_edited || s.ProductGroup) == product_group
      );
    }
  }
  return data;
}
exports.teelixirBillOfMaterials = async (req, res, next) => {
  let { from, to, product_group, future_from, future_to } = req.query;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };
  let future_date = {
    from: future_from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: future_to || moment().format("YYYY-MM-DD"),
  };
  let future_days = moment(future_date.to).diff(
    moment(future_date.from),
    "day"
  );
  let d = 30;
  let days = moment(date.to).diff(moment(date.from), "day");
  let slots = Math.round(days / d);

  let slotDates = Array.from(Array(slots)).map((s, i) => {
    let f = i * d;

    return {
      // from1: f,
      from: moment(date.from).add(f, "day").format("YYYY-MM-DD"),
      // to1: f + d,
      to: moment(date.from)
        .add(f + d, "day")
        .format("YYYY-MM-DD"),
    };
  });

  let data = await getTeelixirBillOfMaterialsData(
    date.from,
    date.to,
    product_group
  );
  let finalData = [];
  if (slots > 1) {
    for (i = 0; i < slotDates.length; i++) {
      let sdate = slotDates[i];
      let data1 = await getTeelixirBillOfMaterialsData(
        sdate.from,
        sdate.to,
        product_group
      );

      finalData.push(data1);
    }

    data = data.map((d) => {
      let slotsSaleUnit = finalData.reduce((s, r) => {
        let pr = r.find(
          (a) => a.BillNumber == d.BillNumber && a.ProductCode == d.ProductCode
        );
        // console.log(r.length)

        return [...s, pr?.TotalInvoiceQuantity || 0];
      }, []);

      let LowMonthlySales = Math.min(...slotsSaleUnit);
      let sum = slotsSaleUnit.reduce((s, r) => {
        return s + r;
      }, 0);
      let AverageMonthlySales = Math.round(sum / slots);
      let HighMonthlySales = Math.max(...slotsSaleUnit);

      return {
        ...d,
        slotsSaleUnit,
        future_days,
        LowMonthlySales,
        AverageMonthlySales,
        HighMonthlySales,
      };
    });
  } else {
    data = data.map((d) => {
      return { ...d, future_days };
    });
  }

  res.json({
    status: true,
    slotDates,
    slots,
    days,
    data: data,
    message: "",
  });
};
exports.loadTeelixirBillOfMaterials = async (req, res, next) => {
  await getKIKBillofMaterials(true, true);

  res.json({
    status: true,
    message: "",
  });
};

async function getTeelixirStockNeedsData(from, to, product_group) {
  let data = await getBillOfMaterialStockNeeds(from, to);
  // writeJsonFile('WWWW',data)

  data = data.filter((s) => {
    return ["Raw Materials", "Packaging Materials", "Blend"].includes(
      s.ProductGroup_edited || s.ProductGroup
    );
  });
  // console.log("product_group", from, to, product_group);
  if (product_group) {
    if (product_group == "Blend") {
      data = data.filter((s) => {
        if (s.ProductGroup_edited) {
          return s.ProductGroup_edited == product_group;
        }
        return s.blendProduct;
      });
    } else if (product_group == "evr-else") {
      data = data.filter(
        (s) =>
          !["Raw Materials", "Packaging Materials", "Obsolete"].includes(
            s.ProductGroup_edited || s.ProductGroup
          )
      );
    } else {
      data = data.filter(
        (s) => (s.ProductGroup_edited || s.ProductGroup) == product_group
      );
    }
  }
  return data;
}
exports.teelixirStockNeeds = async (req, res, next) => {
  let { from, to, product_group, future_from, future_to } = req.query;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };
  let future_date = {
    from: future_from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: future_to || moment().format("YYYY-MM-DD"),
  };
  let future_days = moment(future_date.to).diff(
    moment(future_date.from),
    "day"
  );
  let d = 30;
  let days = moment(date.to).diff(moment(date.from), "day");
  let slots = Math.round(days / d);

  let slotDates = Array.from(Array(slots)).map((s, i) => {
    let f = i * d;

    return {
      // from1: f,
      from: moment(date.from).add(f, "day").format("YYYY-MM-DD"),
      // to1: f + d,
      to: moment(date.from)
        .add(f + d, "day")
        .format("YYYY-MM-DD"),
    };
  });

  let data = await getTeelixirStockNeedsData(date.from, date.to, product_group);
  let finalData = [];
  // slots=1
  if (slots > 1) {
    for (i = 0; i < slotDates.length; i++) {
      let sdate = slotDates[i];
      let data1 = await getTeelixirStockNeedsData(
        sdate.from,
        sdate.to,
        product_group
      );

      finalData.push(data1);
    }

    data = data.map((d) => {
      let slotsSaleUnit = finalData
        .reduce((s, r) => {
          let pr = r.find((a) => a.ProductCode == d.ProductCode);
          // console.log(r.length)

          return [...s, pr?.TotalInvoiceQuantity || 0];
        }, [])
        .filter(Boolean);

      let LowMonthlySales = Math.min(...slotsSaleUnit);
      let sum = slotsSaleUnit.reduce((s, r) => {
        return s + r;
      }, 0);
      let AverageMonthlySales = Math.round(sum / slots);
      let HighMonthlySales = Math.max(...slotsSaleUnit);

      let EstimatedUsage =
        (HighMonthlySales - AverageMonthlySales) / 2 + AverageMonthlySales;

      // let Estimated=data || row.TotalInvoiceQuantity
      // return `${formatNumber(data || row.TotalInvoiceQuantity)} ${row.UnitOfMeasure||''}`;

      let perDayUnit = EstimatedUsage / 30;
      EstimatedUsage = future_days * perDayUnit;

      //////////////////
      let slotsSaleUnitBlend = finalData
        .reduce((s, r) => {
          let pr = r.find((a) => a.ProductCode == d.ProductCode);
          // console.log(r.length)

          return [...s, pr?.TotalInvoiceQuantityBlend || 0];
        }, [])
        .filter(Boolean);

      let LowMonthlySalesBlend = Math.min(...slotsSaleUnitBlend);
      let sumBlend = slotsSaleUnitBlend.reduce((s, r) => {
        return s + r;
      }, 0);
      let AverageMonthlySalesBlend = Math.round(sumBlend / slots);
      let HighMonthlySalesBlend = Math.max(...slotsSaleUnitBlend);

      let EstimatedUsageBlend =
        (HighMonthlySalesBlend - AverageMonthlySalesBlend) / 2 +
        AverageMonthlySalesBlend;

      // let Estimated=data || row.TotalInvoiceQuantity
      // return `${formatNumber(data || row.TotalInvoiceQuantity)} ${row.UnitOfMeasure||''}`;

      let perDayUnitBlend = EstimatedUsageBlend / 30;
      EstimatedUsageBlend = future_days * perDayUnitBlend;

      return {
        ...d,
        slotsSaleUnit,
        future_days,
        LowMonthlySales,
        AverageMonthlySales,
        HighMonthlySales,
        EstimatedUsage,

        LowMonthlySalesBlend,
        AverageMonthlySalesBlend,
        HighMonthlySalesBlend,
        EstimatedUsageBlend,
      };
    });
  } else {
    data = data.map((d) => {
      return { ...d, future_days };
    });
  }

  res.json({
    status: true,
    slotDates,
    slots,
    days,
    data: data,
    message: "",
  });
};

exports.ch2Data = async (req, res, next) => {
  let { from, to } = req.query;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let data = await getOborneStockData({ from: date.from, to: date.to });

  res.json({
    status: true,

    date,
    data: data,
    message: "",
  });
};

exports.ch2DataDetail = async (req, res, next) => {
  let { from, to, new_sku } = req.query;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let data = await getOborneStockDataBySkU({
    new_sku,
    from: date.from,
    to: date.to,
  });

  res.json({
    status: true,

    date,
    data: data,
    message: "",
  });
};

exports.productSalesVolume = async (req, res, next) => {
  let { from, to } = req.query;

  let results = await query(
    `SELECT id,order_id,items FROM bc_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [from, to]
  );
  let data = results.reduce((d, r) => {
    let items = JSON.parse(r.items);
    let itms = items.reduce((dd, item) => {
      let pr = d[item.sku];
      let count = pr?.count || 0;
      let quantity = parseInt(pr?.quantity || 0);
      let total_inc_tax = parseFloat(pr?.total_inc_tax || 0);
      // let unit_prices = pr?.unit_prices || [];

      let prdd = dd[item.sku];
      let countdd = prdd?.count || 0;
      let quantitydd = parseInt(prdd?.quantity || 0);
      let total_inc_taxdd = parseFloat(prdd?.total_inc_tax || 0);

      return {
        ...dd,
        [item.sku]: {
          ...item,
          count: count + countdd + 1,
          quantity: parseInt(item?.quantity || 0) + quantity + quantitydd,
          total_inc_tax:
            parseFloat(item?.total_inc_tax || 0) +
            total_inc_tax +
            total_inc_taxdd,
          unit_price: parseFloat(item?.price_inc_tax || 0),
          // unit_prices:[...unit_prices,parseFloat(item?.price_inc_tax||0)]
        },
      };
    }, {});
    return { ...d, ...itms };
  }, {});
  res.json({
    status: true,
    message: "",
    data: Object.values(data), //.slice(0, 25),
  });
};

exports.customerBuyingHistory = async (req, res, next) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  req.on("close", () => {
    console.log("disconnected");
  });
  let {
    from,
    to,
    product_ids,
    lastorder = "0",
    validContact = "0",
  } = req.query;
  let lastOrderDate = {
    from: moment(to).add(1, "day").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
  };
  product_ids = product_ids.split(",").filter(Boolean);
  // console.log(product_ids);
  sendData(res, { type: "progress", message: "fetching...0/2" });
  let results = await query(
    `SELECT id,order_id,customer_id,first_name,last_name,phone,phone_valid,updated_phone,email,date_created,items FROM bc_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [from, to]
  );
  sendData(res, { type: "progress", message: "fetching...1/2" });
  let resultsLastOrders = await query(
    `SELECT id,order_id,customer_id,first_name,last_name,phone,phone_valid,updated_phone, email,date_created,items FROM bc_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [lastOrderDate.from, lastOrderDate.to]
  );
  sendData(res, { type: "progress", message: "fetching...2/2" });

  let total = results.length;
  // sendData(res, { type: "progress", message: `progress...0/${total}` });
  // let productData = {};
  let data = results.reduce((r, d, i) => {
    let customer_id = d.phone || d.email || d.customer_id;
    let items = JSON.parse(d.items);
    let products = r[customer_id]?.products || [];
    let itm = items;
    // console.log('itm',itm.length)
    if (product_ids.length) {
      itm = itm.filter((p) => {
        // console.log(product_ids,`${p.sku}`,product_ids.includes(`${p.sku}`))
        return product_ids.includes(`${p.sku}`);
      });
    }
    // console.log('itm 1',itm.length)
    itm = itm.map((p) => {
      // productData[p.sku] = {
      //   sku: p.sku,
      //   name: p.name,
      // };

      return {
        // ...p,
        // "Order No.": d.order_id,
        // SKU: p.sku,
        // Desc: p.name,
        // Qty: p.quantity,
        // "Unit Price": p.price_inc_tax,
        // Price: p.total_inc_tax,
        // "Purchase date": moment(d.date_created).format("YYYY-MM-DD hh:mm:ss A"),

        order_number: d.order_id,
        sku: p.sku,
        product_id: p.product_id,
        // product_url: p.handle
        // ? `https://teelixir.com.au/products/${p.handle}`
        // : "",
        product_name: p.name,
        quantity: p.quantity,
        unit_price: p.price_inc_tax,
        total_price: p.total_inc_tax,
        purchase_date: moment(d.date_created).format("YYYY-MM-DD HH:mm:ss"),
      };
    });

    if (!itm.length) {
      sendData(res, {
        type: "progress",
        message: `(1/4) progress... ${i + 1} / ${total}`,
      });
      return r;
    }

    ////
    if (lastorder == "1") {
      let [f] = itm;
      if (products.find((d) => d.sku == f.sku)) {
        sendData(res, {
          type: "progress",
          message: `(1/4) progress...${i + 1} / ${total}`,
        });
        return r;
      }
    }

    sendData(res, {
      type: "progress",
      message: `(1/4) progress...${i + 1} / ${total}`,
    });
    ////
    return {
      ...r,
      [customer_id]: {
        customer_id: customer_id,

        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        updated_phone: d.updated_phone,
        phone_valid: d.phone_valid,
        email: d.email,
        valid_contacts:
          [d.first_name, d.last_name, d.phone, d.email].filter(Boolean)
            .length == 4,
        products: [...products, ...itm],
      },
    };
  }, {});

  let finalData = Object.values(data);
  if (validContact == "1") {
    total = finalData.length;
    finalData = finalData.filter((d, i) => {
      sendData(res, {
        type: "progress",
        message: `(2/4) progress...${i + 1} / ${total}`,
      });
      return d.valid_contacts;
    });
  }
  total = finalData.length;
  finalData = finalData.map((d, i) => {
    let last_order = resultsLastOrders.find(
      (c) => c.customer_id == d.customer_id
    );
    sendData(res, {
      type: "progress",
      message: `(3/4) progress...${i + 1} / ${total}`,
    });
    return {
      ...d,
      last_order,
    };
  });
  if (lastorder == "1") {
    total = finalData.length;
    finalData = finalData.filter((d, i) => {
      sendData(res, {
        type: "progress",
        message: `(4/4) progress...${i + 1} / ${total}`,
      });
      return !d.last_order;
    });
  }

  sendData(res, { type: "success", data: finalData });
  res.end();

  // res.json({
  //   status: true,
  //   message: "",
  //   data: finalData, //Object.values(data), //.slice(0, 25),
  //   // productData,
  // });
};

exports.runNumVerify = async (req, res, next) => {
  await BCPhoneUpdate();
  await BCCustomerPhoneVerifyUpdate();
  res.json({
    status: true,
    message: "",
  });
};

exports.shopifyTeelixirProductSalesVolumeView = async (req, res, next) => {
  let { from, to } = req.query;

  let results = await query(
    `SELECT id,order_id,items FROM shopify_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [from, to]
  );
  let data = results.reduce((d, r) => {
    let items = JSON.parse(r.items);
    let itms = items.reduce((dd, item) => {
      let pr = d[item.sku];
      let count = pr?.count || 0;
      let quantity = parseInt(pr?.quantity || 0);
      let total_inc_tax = parseFloat(pr?.total_inc_tax || 0);
      // let unit_prices = pr?.unit_prices || [];

      let prdd = dd[item.sku];
      let countdd = prdd?.count || 0;
      let quantitydd = parseInt(prdd?.quantity || 0);
      let total_inc_taxdd = parseFloat(prdd?.total_inc_tax || 0);

      return {
        ...dd,
        [item.sku]: {
          ...item,
          count: count + countdd + 1,
          quantity: parseInt(item?.quantity || 0) + quantity + quantitydd,
          total_inc_tax:
            parseFloat(item?.total_inc_tax || 0) +
            total_inc_tax +
            total_inc_taxdd,
          unit_price: parseFloat(item?.price_inc_tax || 0),
          // unit_prices:[...unit_prices,parseFloat(item?.price_inc_tax||0)]
        },
      };
    }, {});
    return { ...d, ...itms };
  }, {});
  res.json({
    status: true,
    message: "",
    data: Object.values(data), //.slice(0, 25),
  });
};

exports.shopifyTeelixirCustomerBuyingHistoryView = async (req, res, next) => {
  let {
    from,
    to,
    product_ids,
    lastorder = "0",
    validContact = "0",
  } = req.query;
  let lastOrderDate = {
    from: moment(to).add(1, "day").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
  };
  product_ids = product_ids.split(",").filter(Boolean);
  // console.log(lastOrderDate)
  let results = await query(
    `SELECT id,order_id,customer_id,first_name,last_name,phone,phone_valid,updated_phone, email,date_created,items FROM shopify_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [from, to]
  );

  let resultsLastOrders = await query(
    `SELECT id,order_id,customer_id,first_name,last_name,phone,phone_valid,updated_phone, email,date_created,items FROM shopify_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [lastOrderDate.from, lastOrderDate.to]
  );
  // let productData = {};
  let data = results.reduce((r, d) => {
    let customer_id = d.phone || d.email || d.customer_id;
    let items = JSON.parse(d.items);
    let products = r[customer_id]?.products || [];
    let itm = items;

    if (product_ids.length) {
      itm = itm.filter((p) => {
        // console.log(product_ids,p.product_id,product_ids.includes(`${p.product_id}`))
        return product_ids.includes(`${p.sku}`);
      });
    }
    itm = itm.map((p) => {
      // productData[p.sku] = {
      //   sku: p.sku,
      //   name: p.name,
      // };

      return {
        // ...p,
        // "Order No.": d.order_id,
        // SKU: p.sku,
        // Desc: p.name,
        // Qty: p.quantity,
        // "Unit Price": p.price_inc_tax,
        // Price: p.total_inc_tax,

        // "Product URL": p.handle
        //   ? `https://teelixir.com.au/products/${p.handle}`
        //   : "",
        // "Purchase date": moment(d.date_created).format("YYYY-MM-DD hh:mm:ss A"),
        // ProductID: p.product_id,

        order_number: d.order_id,
        sku: p.sku,
        product_id: p.product_id,
        product_url: p.handle
          ? `https://teelixir.com.au/products/${p.handle}`
          : "",
        product_name: p.name,
        quantity: p.quantity,
        unit_price: p.price_inc_tax,
        total_price: p.total_inc_tax,
        purchase_date: moment(d.date_created).format("YYYY-MM-DD HH:mm:ss"),
      };
    });

    if (!itm.length) {
      return r;
    }

    ////
    if (lastorder == "1") {
      let [f] = itm;
      if (products.find((d) => d.sku == f.sku)) {
        return r;
      }
    }

    ////
    return {
      ...r,
      [customer_id]: {
        customer_id: customer_id,

        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        updated_phone: d.updated_phone,
        phone_valid: d.phone_valid,
        email: d.email,
        valid_contacts:
          [d.first_name, d.last_name, d.phone, d.email].filter(Boolean)
            .length == 4,

        products: [...products, ...itm],
      },
    };
  }, {});
  // console.log(validContact)
  let finalData = Object.values(data);

  if (validContact == "1") {
    finalData = finalData.filter((d) => {
      return d.valid_contacts;
    });
  }

  finalData = finalData.map((d) => {
    let last_order = resultsLastOrders.find(
      (c) => c.customer_id == d.customer_id
    );
    return {
      ...d,
      last_order,
    };
  });

  if (lastorder == "1") {
    finalData = finalData.filter((d) => {
      return !d.last_order;
    });
  }

  res.json({
    status: true,
    message: "",
    data: finalData, //.slice(0, 25),
    // productData,
  });
};
exports.shopifyTeelixirRunNumVerify = async (req, res, next) => {
  await shopifyTeelixirPhoneUpdate();
  await shopifyCustomerPhoneVerifyUpdate();
  res.json({
    status: true,
    message: "",
  });
};

exports.klaviyoProfiles = async (req, res, next) => {
  let { from, to } = req.query;

  let results = await query(
    `SELECT id,profile_id,first_name,last_name,phone,phone_valid,updated_phone, email,date_created FROM klaviyo_profiles
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [from, to]
  );

  res.json({
    status: true,
    message: "",
    data: results, //.slice(0, 25),
    // productData,
  });
};

exports.shopifyTeelixirKlaviyoProfiles = async (req, res, next) => {
  let {
    from,
    to,
    product_ids,
    lastorder = "0",
    validContact = "0",
  } = req.query;
  let lastOrderDate = {
    from: moment(to).add(1, "day").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
  };
  product_ids = product_ids.split(",").filter(Boolean);
  // console.log(lastOrderDate)
  let results = await query(
    `SELECT shopify_orders.id as id,order_id,customer_id,shopify_orders.first_name as first_name,shopify_orders.last_name as last_name,shopify_orders.phone as phone,shopify_orders.phone_valid as phone_valid,shopify_orders.updated_phone as updated_phone, shopify_orders.email as email, klaviyo_profiles.email as klaviyo_email,shopify_orders.date_created as date_created,items FROM shopify_orders left join klaviyo_profiles on klaviyo_profiles.email=shopify_orders.email
     WHERE SUBSTR(shopify_orders.date_created,1,10) BETWEEN ? AND ? order by shopify_orders.date_created DESC`,
    [from, to]
  );

  let resultsLastOrders = await query(
    `SELECT id,order_id,customer_id,first_name,last_name,phone,phone_valid,updated_phone, email,date_created,items FROM shopify_orders
     WHERE SUBSTR(date_created,1,10) BETWEEN ? AND ? order by date_created DESC`,
    [lastOrderDate.from, lastOrderDate.to]
  );
  // let productData = {};
  let data = results.reduce((r, d) => {
    let customer_id = d.phone || d.email || d.customer_id;
    let items = JSON.parse(d.items);
    let products = r[customer_id]?.products || [];
    let itm = items;

    if (product_ids.length) {
      itm = itm.filter((p) => {
        // console.log(product_ids,p.product_id,product_ids.includes(`${p.product_id}`))
        return product_ids.includes(`${p.sku}`);
      });
    }
    itm = itm.map((p) => {
      // productData[p.sku] = {
      //   sku: p.sku,
      //   name: p.name,
      // };

      return {
        // ...p,
        // "Order No.": d.order_id,
        // SKU: p.sku,
        // Desc: p.name,
        // Qty: p.quantity,
        // "Unit Price": p.price_inc_tax,
        // Price: p.total_inc_tax,

        // "Product URL": p.handle
        //   ? `https://teelixir.com.au/products/${p.handle}`
        //   : "",
        // "Purchase date": moment(d.date_created).format("YYYY-MM-DD hh:mm:ss A"),
        // ProductID: p.product_id,

        order_number: d.order_id,
        sku: p.sku,
        product_id: p.product_id,
        product_url: p.handle
          ? `https://teelixir.com.au/products/${p.handle}`
          : "",
        product_name: p.name,
        quantity: p.quantity,
        unit_price: p.price_inc_tax,
        total_price: p.total_inc_tax,
        purchase_date: moment(d.date_created).format("YYYY-MM-DD HH:mm:ss"),
      };
    });

    if (!itm.length) {
      return r;
    }

    ////
    if (lastorder == "1") {
      let [f] = itm;
      if (products.find((d) => d.sku == f.sku)) {
        return r;
      }
    }

    ////
    return {
      ...r,
      [customer_id]: {
        customer_id: customer_id,

        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        updated_phone: d.updated_phone,
        phone_valid: d.phone_valid,
        email: d.email,
        klaviyo_email: d.klaviyo_email || "",
        valid_contacts:
          [d.first_name, d.last_name, d.phone, d.email].filter(Boolean)
            .length == 4,

        products: [...products, ...itm],
      },
    };
  }, {});
  // console.log(validContact)
  let finalData = Object.values(data);

  if (validContact == "1") {
    finalData = finalData.filter((d) => {
      return d.valid_contacts;
    });
  }

  finalData.map((d) => {
    let last_order = resultsLastOrders.find(
      (c) => c.customer_id == d.customer_id
    );
    return {
      ...d,
      last_order,
    };
  });

  if (lastorder == "1") {
    finalData = finalData.filter((d) => {
      return !d.last_order;
    });
  }

  res.json({
    status: true,
    message: "",
    data: finalData, //.slice(0, 25),
    // productData,
  });
};
