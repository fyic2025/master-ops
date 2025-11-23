const { getMySqlQuery } = require("../config/mysql");
const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const path = require("path");
const lodash = require("lodash");
const moment = require("moment-timezone");
const cliProgress = require("cli-progress");
const ExcelJS = require("exceljs");
const { default: axios } = require("axios");
const { isDev } = require("../config/app");
const SHA256 = require("crypto-js/hmac-sha256");
const Base64 = require("crypto-js/enc-base64");
const {
  getLastMonth,
  writeCSVFile,
  writeJsonFile,
  writeJsonFileCron,
  readJsonFile,
  sleep,
} = require("../util/app.util");
moment.tz.setDefault("Australia/Melbourne");
sgMail.setApiKey(
  "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"
);
// console.log('www',new Date(1710892800000),moment(new Date(1710892800000)).format('DD/MM/YYYY'),moment(1710892800000).format('DD/MM/YYYY'))
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
function truncateTable() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("TRUNCATE kik_products");

    r(true);
  });
}
function insertProduct(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("SELECT * FROM kik_products WHERE sku = ?", [
      data["ProductCode"],
    ]);

    let isExist = !!results.length;
    let fields = `sku=?,Guid=?,ProductDescription=?,Barcode=?,PackSize=?,Width=?,Height=?,Depth=?,Weight=?,MinStockAlertLevel=?,MaxStockAlertLevel=?,ReOrderPoint=?,LastCost=?,DefaultPurchasePrice=?,DefaultSellPrice=?,CustomerSellPrice=?,AverageLandPrice=?,XeroTaxCode=?,XeroTaxRate=?,TaxablePurchase=?,TaxableSales=?,XeroSalesTaxCode=?,XeroSalesTaxRate=?,XeroSalesAccount=?,XeroCostOfGoodsAccount=?,PurchaseAccount=?`;
    let sql = isExist
      ? `UPDATE kik_products SET ${fields} where sku=?`
      : `INSERT INTO kik_products SET ${fields}`;

    let result1 = await query(sql, [
      data["ProductCode"],
      data["Guid"],
      data["ProductDescription"],
      data["Barcode"],
      data["PackSize"],
      data["Width"],
      data["Height"],
      data["Depth"],
      data["Weight"],
      data["MinStockAlertLevel"],
      data["MaxStockAlertLevel"],
      data["ReOrderPoint"],
      data["LastCost"],
      data["DefaultPurchasePrice"],
      data["DefaultSellPrice"],
      data["CustomerSellPrice"],
      data["AverageLandPrice"],
      data["XeroTaxCode"],
      data["XeroTaxRate"],
      data["TaxablePurchase"],
      data["TaxableSales"],
      data["XeroSalesTaxCode"],
      data["XeroSalesTaxRate"],
      data["XeroSalesAccount"],
      data["XeroCostOfGoodsAccount"],
      data["PurchaseAccount"],
      ...(isExist ? [data["ProductCode"].toString()] : []),
    ]).catch((err) => {
      console.log(data["ProductCode"], isExist, err.sqlMessage);
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
function updateStockProduct(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();

    let fields = `StockGuid=?,OnPurchase=?,AvailableQty=?,QtyOnHand=?,AvgCost=?,TotalCost=?`;
    let sql = `UPDATE kik_products SET ${fields} where Guid=?`;

    let result1 = await query(sql, [
      data["Guid"],
      data["OnPurchase"],
      data["AvailableQty"],
      data["QtyOnHand"],
      data["AvgCost"],
      data["TotalCost"],

      data["ProductGuid"],
    ]).catch((err) => {
      console.log(data["ProductCode"], err.sqlMessage);
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

function truncateStockTable() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("TRUNCATE kik_products_stock");

    r(true);
  });
}

function insertProductStock(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM kik_products_stock WHERE sku = ?",
      [data["ProductCode"]]
    );

    let isExist = !!results.length;
    let fields = `sku=?,ProductGuid=?,Guid=?,AvailableQty=?,QtyOnHand=?,AvgCost=?,TotalCost=?`;
    let sql = isExist
      ? `UPDATE kik_products_stock SET ${fields} where sku=?`
      : `INSERT INTO kik_products_stock SET ${fields}`;

    let result1 = await query(sql, [
      data["ProductCode"],
      data["ProductGuid"],
      data["Guid"],
      data["AvailableQty"],
      data["QtyOnHand"],
      data["AvgCost"],
      data["TotalCost"],

      ...(isExist ? [data["ProductCode"].toString()] : []),
    ]).catch((err) => {
      console.log(data["ProductCode"], isExist, err.sqlMessage);
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

exports.getKIKProducts = async (truncate = true, teelixir = false) => {
  if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 200;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return
  let url = `https://api.unleashedsoftware.com/Products/Page/${1}`;

  const hash = SHA256(
    "",
    "a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=="
  );
  const hash64 = Base64.stringify(hash);
  console.log(hash64);
  let headers = {
    "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
    "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (teelixir) {
    headers = {
      ...headers,
      //teelixir
      "api-auth-id": "7fda9404-7197-477b-89b1-dadbcefae168",
      "api-auth-signature": hash64,
    };
  }

  const { data } = await axios.get(url, {
    headers: headers,
  });
  let metaData = data.Pagination;

  console.log(metaData);
  // return;
  let finalData = [];
  if (metaData) {
    let total_pages = metaData.NumberOfPages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let url = `https://api.unleashedsoftware.com/Products/Page/${j}`;

      const { data: res } = await axios.get(url, {
        headers: headers,
      });
      if (res.Items) {
        // let total_products = res.data.length;

        let filename = `kik_${limit}_${j}`; //_${new Date().getTime()}`;
        // filename = `uhp_prods_1679411095707`;
        let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        //json file ////////
        fs.writeFileSync(jsonFilePath, JSON.stringify(res.Items));
        ////////

        finalData = finalData.concat(res.Items);

        let dataChunks = lodash.chunk(res.Items, 50);
        let totalChunks = dataChunks.length;
        if (!teelixir) {
          for (let i = 0; i < totalChunks; i++) {
            let dataRow = dataChunks[i];
            // console.log(dataRow)
            await Promise.allSettled(
              dataRow.map((row) => {
                return insertProduct(row);
              })
            );
          }
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
  writeJsonFileCron("kik", finalData);
  if (teelixir) {
    writeJsonFile("kik_all_products", finalData);
  }
  console.log("Success");
};

exports.getKIKStocks = async (truncate = true, teelixir = false) => {
  // if (truncate) await truncateStockTable();
  console.log("Fetching metadata.....");
  let limit = 200;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return
  const hash = SHA256(
    "",
    "a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=="
  );
  const hash64 = Base64.stringify(hash);
  console.log(hash64);
  let headers = {
    "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
    "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (teelixir) {
    headers = {
      ...headers,
      //teelixir
      "api-auth-id": "7fda9404-7197-477b-89b1-dadbcefae168",
      "api-auth-signature": hash64,
    };
  }
  let url = `https://api.unleashedsoftware.com/StockOnHand/Page/${1}`;

  const { data } = await axios.get(url, {
    headers: headers,
  });
  let metaData = data.Pagination;

  console.log(metaData);
  // return;
  let finalData = [];
  if (metaData) {
    let total_pages = metaData.NumberOfPages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let url = `https://api.unleashedsoftware.com/StockOnHand/Page/${j}`;

      const { data: res } = await axios.get(url, {
        headers: headers,
      });
      if (res.Items) {
        // let total_products = res.data.length;

        let filename = `kik_stock_${limit}_${j}`; //_${new Date().getTime()}`;
        // filename = `uhp_prods_1679411095707`;
        let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        //json file ////////
        fs.writeFileSync(jsonFilePath, JSON.stringify(res.Items));
        ////////
        finalData = finalData.concat(res.Items);
        let dataChunks = lodash.chunk(res.Items, 50);
        let totalChunks = dataChunks.length;
        if (!teelixir) {
          for (let i = 0; i < totalChunks; i++) {
            let dataRow = dataChunks[i];
            // console.log(dataRow)
            await Promise.allSettled(
              dataRow.map((row) => {
                return updateStockProduct(row);
              })
            );
          }
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
  writeJsonFileCron("kik_stock", finalData);
  if (teelixir) {
    writeJsonFile("kik_stock_all_products", finalData);
  }
  console.log("Success");
};
exports.getKIKBillofMaterials = async (truncate = true, teelixir = false) => {
  // if (truncate) await truncateStockTable();
  console.log("Fetching metadata.....");
  let limit = 200;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return
  const hash = SHA256(
    "",
    "a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=="
  );
  const hash64 = Base64.stringify(hash);
  console.log(hash64);
  let headers = {
    "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
    "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (teelixir) {
    headers = {
      ...headers,
      //teelixir
      "api-auth-id": "7fda9404-7197-477b-89b1-dadbcefae168",
      "api-auth-signature": hash64,
    };
  }
  let url = `https://api.unleashedsoftware.com/BillOfMaterials/Page/${1}`;

  const { data } = await axios.get(url, {
    headers: headers,
  });
  let metaData = data.Pagination;

  console.log(metaData);
  // return;
  let finalData = [];
  if (metaData) {
    let total_pages = metaData.NumberOfPages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let url = `https://api.unleashedsoftware.com/BillOfMaterials/Page/${j}`;

      const { data: res } = await axios.get(url, {
        headers: headers,
      });
      if (res.Items) {
        // let total_products = res.data.length;

        let filename = `kik_stock_${limit}_${j}`; //_${new Date().getTime()}`;
        // filename = `uhp_prods_1679411095707`;
        let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        //json file ////////
        fs.writeFileSync(jsonFilePath, JSON.stringify(res.Items));
        ////////
        finalData = finalData.concat(res.Items);
        let dataChunks = lodash.chunk(res.Items, 50);
        let totalChunks = dataChunks.length;

        // for (let i = 0; i < totalChunks; i++) {
        //   let dataRow = dataChunks[i];
        //   // console.log(dataRow)
        //   await Promise.allSettled(
        //     dataRow.map((row) => {
        //       return updateStockProduct(row);
        //     })
        //   );
        // }
      }
      bar1.increment();
    }
  }
  bar1.stop();
  // writeJsonFileCron("kik_billofMat", finalData);
  writeJsonFile("kik_billofmat_all_products", finalData);
  console.log("Success");
};

////get paried products
// SELECT kik_products.sku as kik_sku,kik_products.ProductDescription,kik_products.Barcode,kik_products.PackSize,kik_products.Width,kik_products.Height,kik_products.Depth,kik_products.Weight,kik_products.MinStockAlertLevel,kik_products.MaxStockAlertLevel,kik_products.ReOrderPoint,kik_products.LastCost,kik_products.DefaultPurchasePrice,kik_products.DefaultSellPrice,kik_products.CustomerSellPrice,kik_products.AverageLandPrice,kik_products.XeroTaxCode,kik_products.XeroTaxRate,kik_products.TaxablePurchase,kik_products.TaxableSales,kik_products.XeroSalesTaxCode,kik_products.XeroSalesTaxRate,kik_products.XeroSalesAccount,kik_products.XeroCostOfGoodsAccount,kik_products.PurchaseAccount,bc_products.product_id,bc_products.inventory_level, bc_products.name as bc_name,bc_products.sku as bc_sku,bc_products.categories FROM bc_products
//     left JOIN kik_products on CONCAT_WS(" - ", "KIK",kik_products.sku) =bc_products.sku WHERE kik_products.id IS NOT NULL
// UNION
// SELECT kik_products.sku as kik_sku,kik_products.ProductDescription,kik_products.Barcode,kik_products.PackSize,kik_products.Width,kik_products.Height,kik_products.Depth,kik_products.Weight,kik_products.MinStockAlertLevel,kik_products.MaxStockAlertLevel,kik_products.ReOrderPoint,kik_products.LastCost,kik_products.DefaultPurchasePrice,kik_products.DefaultSellPrice,kik_products.CustomerSellPrice,kik_products.AverageLandPrice,kik_products.XeroTaxCode,kik_products.XeroTaxRate,kik_products.TaxablePurchase,kik_products.TaxableSales,kik_products.XeroSalesTaxCode,kik_products.XeroSalesTaxRate,kik_products.XeroSalesAccount,kik_products.XeroCostOfGoodsAccount,kik_products.PurchaseAccount,bc_products.product_id,bc_products.inventory_level, bc_products.name as bc_name,bc_products.sku as bc_sku,bc_products.categories FROM bc_products
//     left JOIN kik_products on kik_products.sku=bc_products.sku WHERE kik_products.id IS NOT NULL;
exports.getKIKCustomersOrders = async () => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 200;

  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return
  let url = `https://api.unleashedsoftware.com/Customers/Page/${1}`;

  const { data } = await axios.get(url, {
    headers: {
      "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
      "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  let metaData = data.Pagination;

  console.log(metaData);
  // return;

  if (metaData) {
    let total_pages = metaData.NumberOfPages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);

    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let url = `https://api.unleashedsoftware.com/Customers/Page/${j}`;

      const { data: res } = await axios.get(url, {
        headers: {
          "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
          "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (res.Items) {
        // let total_products = res.data.length;

        let filename = `kik_customers_${limit}_${j}`; //_${new Date().getTime()}`;
        // filename = `uhp_prods_1679411095707`;
        let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        //json file ////////
        fs.writeFileSync(jsonFilePath, JSON.stringify(res.Items));
        ////////
        let dataChunks = lodash.chunk(res.Items, 50);
        let totalChunks = dataChunks.length;

        // for (let i = 0; i < totalChunks; i++) {
        //   let dataRow = dataChunks[i];
        //   // console.log(dataRow)
        //   await Promise.allSettled(
        //     dataRow.map((row) => {
        //       // return insertProduct(row);
        //     })
        //   );
        // }

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
  console.log("Success");
};

exports.getKIKSalesInvoices = async (teelixir = true) => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 200;
  let finalData = [];
  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  const hash = SHA256(
    "",
    "a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=="
  );
  const hash64 = Base64.stringify(hash);
  console.log(hash64);

  let url = `https://api.unleashedsoftware.com/Invoices/Page/${1}`;
  let headers = {
    "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
    "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",

    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (teelixir) {
    headers = {
      ...headers,
      //teelixir
      "api-auth-id": "7fda9404-7197-477b-89b1-dadbcefae168",
      "api-auth-signature": hash64,
    };
  }

  const { data } = await axios.get(url, {
    headers: headers,
  });
  let metaData = data.Pagination;

  console.log(metaData);
  // return;

  if (metaData) {
    let total_pages = metaData.NumberOfPages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let url = `https://api.unleashedsoftware.com/Invoices/Page/${j}`;

      const { data: res } = await axios.get(url, {
        headers: headers,
      });
      if (res?.Items) {
        // let total_products = res.data.length;
        finalData = finalData.concat(res.Items);
        let filename = `kik_sales_invoices_${limit}_${j}`; //_${new Date().getTime()}`;
        // filename = `uhp_prods_1679411095707`;
        let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        //json file ////////
        fs.writeFileSync(jsonFilePath, JSON.stringify(res.Items));
        ////////
        let dataChunks = lodash.chunk(res.Items, 50);
        let totalChunks = dataChunks.length;

        // for (let i = 0; i < totalChunks; i++) {
        //   let dataRow = dataChunks[i];
        //   // console.log(dataRow)
        //   await Promise.allSettled(
        //     dataRow.map((row) => {
        //       // return insertProduct(row);
        //     })
        //   );
        // }

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

  let filename = `kik_final_sales_invoices`; //_${new Date().getTime()}`;
  if (teelixir) {
    writeJsonFile("teelixir_final_sales_invoices", finalData);
  }
  // filename = `uhp_prods_1679411095707`;
  let jsonFilePath = path.resolve("download-files", `${filename}.json`);
  //json file ////////
  fs.writeFileSync(jsonFilePath, JSON.stringify(finalData));
  console.log("download Success kik_final_sales_invoices");
  return finalData;
};
let dateProps = "InvoiceDate"; //"OrderDate"|"CreatedOn"|"CompletedDate"|"InvoiceDate"
exports.generateKIKInvoiceUnitReport = async (data, teelixir = true) => {
  let currentDate = moment();
  let _dates = {};
  _dates.YTD = {
    from: currentDate.clone().startOf("year").format("YYYY-MM-DD"),
    to: currentDate.clone().format("YYYY-MM-DD"),
    label: "YTD",
  };
  _dates.MTD = {
    from: currentDate.clone().startOf("month").format("YYYY-MM-DD"),
    to: currentDate.clone().format("YYYY-MM-DD"),
    label: "MTD",
  };
  _dates.lastMonth = {
    from: currentDate
      .clone()
      .subtract(1, "month")
      .startOf("month")
      .format("YYYY-MM-DD"),
    to: currentDate
      .clone()
      .subtract(1, "month")
      .endOf("month")
      .format("YYYY-MM-DD"),
    label: "Last Month",
  };

  _dates.M1 = getLastMonth(1, currentDate);
  _dates.M2 = getLastMonth(2, currentDate);
  _dates.M3 = getLastMonth(3, currentDate);
  _dates.M4 = getLastMonth(4, currentDate);
  _dates.M5 = getLastMonth(5, currentDate);
  _dates.M6 = getLastMonth(6, currentDate);
  _dates.M7 = getLastMonth(7, currentDate);
  _dates.M8 = getLastMonth(8, currentDate);
  _dates.M9 = getLastMonth(9, currentDate);
  _dates.M10 = getLastMonth(10, currentDate);
  _dates.M11 = getLastMonth(11, currentDate);
  _dates.M12 = getLastMonth(12, currentDate);

  _dates.D30 = {
    from: currentDate.clone().subtract(30, "day").format("YYYY-MM-DD"),
    to: currentDate.clone().format("YYYY-MM-DD"),
    label: "D30",
  };

  _dates.D60 = {
    from: currentDate.clone().subtract(60, "day").format("YYYY-MM-DD"),
    to: currentDate.clone().format("YYYY-MM-DD"),
    label: "D60",
  };

  _dates.D90 = {
    from: currentDate.clone().subtract(90, "day").format("YYYY-MM-DD"),
    to: currentDate.clone().format("YYYY-MM-DD"),
    label: "D90",
  };
  // console.log(_dates);
  // return;

  // data = require("../../download-files/kik_final_salesorder.json");
  // console.log(data.length,Array.from(new Set( data.map(d=>d.OrderStatus))),Array.from(new Set( data.map(d=>d.CreatedBy))));
  // [
  //   'colette@teelixir.com',
  //   'Shopify',
  //   'accounts@kikaimarkets.com',
  //   'jayson@fyic.com.au'
  // ]
  // (r) => r.OrderStatus == "Completed" && ["Shopify"].includes( r.CreatedBy)
  //  let tfrom = moment("2024-03-01");
  //   let tto = moment("2024-03-26");
  //   let orderDate=moment(moment("2024-03-26T15:24:16+11:00").format('YYYY-MM-DD'))
  // console.log("2024-03-26T15:24:16+11:00",orderDate,orderDate.isSameOrAfter(tfrom) , orderDate.isSameOrBefore(tto))
  // return
  // data = [];

  ///

  let shopifyOrders = [];
  //////////CAll shopify API/////////////
  if (teelixir) {
    if (isDev) {
      shopifyOrders = require("../../download-files/kik_shopify_orders.json");
    } else {
      shopifyOrders = await getShopifyOrders(
        {},
        1,
        [],
        [
          _dates.MTD,
          _dates.M1,
          _dates.M2,
          _dates.M3,
          _dates.M4,
          _dates.M5,
          _dates.M6,
          _dates.M7,
          _dates.M8,
          _dates.M9,
          _dates.M10,
          _dates.M11,
          _dates.M12,
        ]
      );
    }
    console.log("shopifyOrders", shopifyOrders.length);
  }
  /////////
  ////////////////
  /////////////
  // shopifyOrders = shopifyOrders.filter((d) => {
  //   let orderDate = moment(moment(d.created_at).format("YYYY-MM-DD"));
  //   let from = moment("2024-03-01");
  //   let to = moment("2024-03-26");

  //   return orderDate.isSameOrAfter(from) && orderDate.isSameOrBefore(to); //.isBetween(from, to);
  // });

  // let uniq = Array.from(new Set(shopifyOrders.map((d) => d.order_number)));
  // console.log("shopifyOrders date filter,", shopifyOrders.length, uniq.length);

  // // shopifyOrders = shopifyOrders.concat(orders);

  // let counters = shopifyOrders.reduce((s, r) => {
  //   return {
  //     ...s,
  //     [r.order_number]: {
  //       id: r.id,
  //       created_at: r.created_at,
  //       count: (s[r.order_number]?.count || 0) + 1,
  //     },
  //   };
  // }, {});

  ///////MONTh Filter
  if (false) {
    let from = _dates.MTD.from;
    let to = _dates.MTD.to;
    let _from = moment(from).utc();
    let _to = moment(to).utc();

    data = data.filter((d) => {
      let orderDate = moment(
        moment(d[dateProps]).utc().format("YYYY-MM-DD")
      ).utc();

      // console.log(from,_from.format("YYYY-MM-DD"),orderDate.format("YYYY-MM-DD"),to,_to.format("YYYY-MM-DD"),orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to))

      return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to);
    });
    console.log("data filter", from, to, data.length);

    shopifyOrders = shopifyOrders.filter((d) => {
      let orderDate = moment(
        moment(d.created_at).utc().format("YYYY-MM-DD")
      ).utc();

      // console.log(from,_from.format("YYYY-MM-DD"),orderDate.format("YYYY-MM-DD"),to,_to.format("YYYY-MM-DD"),orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to))

      return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to);
    });

    console.log("shopifyOrders filter", from, to, shopifyOrders.length);
  }

  // return

  let filename1 = `kik_shopify_orders`; //_${new Date().getTime()}`;

  let jsonFilePath1 = path.resolve("download-files", `${filename1}.json`);
  // /////////\\\\\/ json file ////////
  if (isDev) {
    // fs.writeFileSync(jsonFilePath1, JSON.stringify(shopifyOrders));
  }
  // return;
  //////////////////
  if (teelixir) {
    data = data.filter((r) => r.OrderNumber.startsWith("SO-"));
  }
  // console.log(
  //   "data--",
  //   data.length,
  //   data.map((d) => d.OrderNumber).join(" | ")
  // );

  ////////////////
  let shopifyData = data.filter((r) => ["Shopify"].includes(r.CreatedBy));
  // (r) => r.OrderStatus == "Completed" && ["Shopify"].includes(r.CreatedBy)
  let withOutShopifyData = data.filter(
    (r) => !["Shopify"].includes(r.CreatedBy)
  );
  console.log(
    "withOutShopifyData--",
    withOutShopifyData.length
    // data.map((d) => d.OrderNumber).join(" | ")
  );

  // r.OrderStatus == "Completed" && !["Shopify"].includes(r.CreatedBy)
  // data = data.filter((r) => r.InvoiceStatus == "Completed");
  // data = data.filter((r) => r.CreatedBy != "Shopify");
  console.log(
    "after filter ",
    moment().format("YYYY-MM-DD hh:mm A"),
    data.length,
    shopifyData.length
  );

  let shopifyFinalDataOri = analyzeShopifySalesData(shopifyOrders);

  let shopifyFinalData = shopifyFinalDataOri;
  let withOutShopifyFinalData = analyzeSalesInvoiceData(withOutShopifyData);
  let finalData = [...shopifyFinalDataOri, ...withOutShopifyFinalData];
  if (!teelixir) {
    shopifyFinalData = analyzeSalesInvoiceData(shopifyData);
    finalData = analyzeSalesInvoiceData(data);
  }
  //////// only unleashed
  // shopifyFinalData = analyzeSalesInvoiceData(shopifyData);
  // finalData = analyzeSalesInvoiceData(data);
  ///////////

  //////// only unleashed shopify
  // shopifyFinalData = analyzeSalesInvoiceData(shopifyData);
  // withOutShopifyFinalData = [];
  // finalData = shopifyFinalData;
  ///////////

  //////ONLY SHOPIFY=====
  // shopifyFinalData=shopifyFinalDataOri
  // withOutShopifyFinalData=[]
  // finalData =shopifyFinalDataOri
  /////////////////
  // let r= getTotalUnit(finalData,_dates.M1.from,_dates.M1.to)

  let filename = `kik_final_salesorder_report1`; //_${new Date().getTime()}`;

  let jsonFilePath = path.resolve("download-files", `${filename}.json`);
  /////////\\\\\/ json file ////////
  // fs.writeFileSync(jsonFilePath, JSON.stringify(shopifyFinalDataOri));

  writeCSVFile(
    "teelixir_invoices",
    finalData.map((r) => {
      return {
        orderNumber: r.orderNumber,
        InvoiceNumber: r.InvoiceNumber,
        totalQty: r.totalQty,
        orderDate: r.orderDate,
        status: r.status,
        dateFormat: moment(r.orderDate).format("YYYY-MM-DD hh:mm A"),
        dateFormatUtc: moment(r.orderDate).utc().format("YYYY-MM-DD hh:mm A"),
        InvoiceDate: r.InvoiceDate,
      };
    })
  );
  console.log("Success");
  // return;
  ///generate filter dates/////

  ///////////////
  ////////////
  // let mm = getTotalUnit(finalData, _dates.M1.from, _dates.M1.to);
  // let mm1 = getTotalUnit(finalData, _dates.M2.from, _dates.M2.to);

  // console.log("total unit", mm,mm1);
  // return;
  ///////////////
  ///////////////
  // console.log(_dates, )

  // let lastMonth_sumUnite = getTotalUnit(
  //   finalData,
  //   _dates.M1.from,
  //   _dates.M1.to
  // );

  // console.log(_dates.M1.from, _dates.M1.to, lastMonth_sumUnite);
  // return;

  ///generate customer data/////
  let customersData = getTotalUnitByCustomers(
    withOutShopifyFinalData,
    _dates,
    shopifyFinalData
  );
  // console.log(customersData);
  let productsData = getTotalUnitByProducts(finalData, _dates);
  // console.log(productsData);

  // writeJsonFile('productData',productsData)
  // return;

  let CustomerProductData = getTotalUnitByCustomerProduct(finalData, _dates);
  // console.log(CustomerProductData);
  // jsonFilePath = path.resolve("download-files", `testdata.json`);
  // fs.writeFileSync(jsonFilePath, JSON.stringify(CustomerProductData));

  ///generate total unit data/////
  let yearTarget = 100000;
  let monthTarget = Math.round(yearTarget / 12);

  let MTD_sumUnit = getTotalUnit(finalData, _dates.MTD.from, _dates.MTD.to);

  let MTD_rev = getTotalRevenue(
    finalData,
    _dates.MTD.from,
    _dates.MTD.to,
    "SubTotal"
  );

  let lastMonth_sumUnit = getTotalUnit(finalData, _dates.M1.from, _dates.M1.to);

  let LastMonth_rev = getTotalRevenue(
    finalData,
    _dates.M1.from,
    _dates.M1.to,
    "SubTotal"
  );
  // console.log("lastMonth_sumUnit", lastMonth_sumUnit);
  let M2_sumUnit = getTotalUnit(finalData, _dates.M2.from, _dates.M2.to);
  let M2_rev = getTotalRevenue(
    finalData,
    _dates.M2.from,
    _dates.M2.to,
    "SubTotal"
  );

  let YTD_sumUnit = getTotalUnit(finalData, _dates.YTD.from, _dates.YTD.to);
  let YTD_rev = getTotalRevenue(
    finalData,
    _dates.YTD.from,
    _dates.YTD.to,
    "SubTotal"
  );
  ///generate excel file/////
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Summary - Unit Sold");

  sheet.getCell("A1").value = "Month to Date (MTD)";
  sheet.getCell("A1").font = {
    bold: true,
  };
  sheet.getCell("B1").value = "Total Units";
  sheet.getCell("B1").font = {
    bold: true,
  };
  sheet.getCell("C1").value = "Total Revenue Ex GST";
  sheet.getCell("C1").font = {
    bold: true,
  };
  sheet.getCell("D1").value = "Progress";
  sheet.getCell("D1").font = {
    bold: true,
  };
  sheet.getCell("E1").value = "Gap";
  sheet.getCell("E1").font = {
    bold: true,
  };

  sheet.getCell("A2").value = "MTD";
  sheet.getCell("B2").value = MTD_sumUnit;
  sheet.getCell("C2").value = formatToCurrency(MTD_rev);
  sheet.getCell("C2").alignment = { horizontal: "right" };
  sheet.getCell("D2").value = `${Math.round(
    (MTD_sumUnit / monthTarget) * 100
  )}%`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("E2").value = Math.max(0, monthTarget - MTD_sumUnit);

  sheet.getCell("A3").value = "Last Month";
  sheet.getCell("B3").value = lastMonth_sumUnit;
  sheet.getCell("C3").value = formatToCurrency(LastMonth_rev);
  sheet.getCell("C3").alignment = { horizontal: "right" };
  sheet.getCell("D3").value = `${Math.round(
    (lastMonth_sumUnit / monthTarget) * 100
  )}%`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("E3").value = Math.max(0, monthTarget - lastMonth_sumUnit);

  sheet.getCell("A4").value = "Month Before";
  sheet.getCell("B4").value = M2_sumUnit;
  sheet.getCell("C4").value = formatToCurrency(M2_rev);
  sheet.getCell("C4").alignment = { horizontal: "right" };
  sheet.getCell("D4").value = `${Math.round(
    (M2_sumUnit / monthTarget) * 100
  )}%`;
  sheet.getCell("D4").alignment = { horizontal: "right" };
  sheet.getCell("E4").value = Math.max(0, monthTarget - M2_sumUnit);

  sheet.getCell("A5").value = "Calender YTD";
  sheet.getCell("B5").value = YTD_sumUnit;
  sheet.getCell("C5").value = formatToCurrency(YTD_rev);
  sheet.getCell("C5").alignment = { horizontal: "right" };
  sheet.getCell("D5").value = `${Math.round(
    (YTD_sumUnit / yearTarget) * 100
  )}%`;
  sheet.getCell("D5").alignment = { horizontal: "right" };
  sheet.getCell("E5").value = Math.max(0, yearTarget - YTD_sumUnit);

  //////////////
  sheet.getCell("A7").value = `${moment().year()} Target`;
  sheet.getCell("A7").font = {
    bold: true,
  };
  sheet.getCell("A8").value = "Monthly Target";
  sheet.getCell("B8").value = monthTarget;
  sheet.getCell("A8").font = {
    bold: true,
  };
  sheet.getCell("B8").font = {
    bold: true,
  };

  sheet.getCell("A9").value = "Annual Target";
  sheet.getCell("B9").value = yearTarget;
  sheet.getCell("A9").font = {
    bold: true,
  };
  sheet.getCell("B9").font = {
    bold: true,
  };
  //////////////CUSTOMER TABLE//////////////////////////
  let columns = [
    {
      title: "Customer Name",
      key: "name",
      width: 25,
    },
    {
      heading: "MTD",
      title: "Total Units",
      key: "MTD_sumUnit",
    },
    {
      title: "Total Revenue Ex GST",
      key: "MTD_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.MTD_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M1.label, title: "Total Units", key: "M1", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M1_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M1_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M2.label, title: "Total Units", key: "M2", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M2_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M2_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M3.label, title: "Total Units", key: "M3", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M3_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M3_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M4.label, title: "Total Units", key: "M4", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M4_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M4_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M5.label, title: "Total Units", key: "M5", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M5_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M5_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M6.label, title: "Total Units", key: "M6", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M6_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M6_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M7.label, title: "Total Units", key: "M7", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M7_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M7_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M8.label, title: "Total Units", key: "M8", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M8_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M8_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M9.label, title: "Total Units", key: "M9", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M9_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M9_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M10.label, title: "Total Units", key: "M10", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M10_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M10_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M11.label, title: "Total Units", key: "M11", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M11_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M11_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M12.label, title: "Total Units", key: "M12", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M12_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M12_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    // {  title: "Last Month", key: "lastMonth_sumUnit", width: 20 },
    // {  title: "30 Days", key: "D30_sumUnit" },
    // {  title: "60 Days", key: "D60_sumUnit" },
    // {  title: "90 Days", key: "D90_sumUnit" },
  ];
  let rowNo = 12;
  let colStartAplhaCode = 65;
  /////////////?CUSTOMER COL?////////////
  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1; //String.fromCharCode(i + colStartAplhaCode);
    // console.log(colAlpha)
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }

    if (columns[i].heading) {
      const row = sheet.getRow(rowNo - 1);
      sheet.mergeCells(rowNo - 1, colAlpha, rowNo - 1, colAlpha + 1);
      let cell = row.getCell(colAlpha);
      cell.value = columns[i].heading;

      cell.alignment = { horizontal: "center" };
      // cell.fill = {
      //   type: 'pattern',
      //   pattern:'solid',
      //   fgColor:{argb:i%3?'FFFFF9B7':'FFFFF26B'},
      //   bgColor:{argb:i%2?'FFFFF9B7':'FFFFF26B'},
      // };
      cell.font = {
        bold: true,
      };
    }

    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    cell.value = columns[i].title;
    cell.font = {
      bold: true,
    };
  }
  /////////////?CUSTOMER ROWS?////////////
  for (let j = 0; j < customersData.length; j++) {
    for (let i = 0; i < columns.length; i++) {
      let colAlpha = i + 1; //String.fromCharCode(i + colStartAplhaCode);
      const row = sheet.getRow(rowNo + j + 1);
      let cell = row.getCell(colAlpha);

      cell.value = columns[i].getValue
        ? columns[i].getValue(customersData[j])
        : customersData[j][columns[i].key];
      if (columns[i].alignment) {
        cell.alignment = { horizontal: columns[i].alignment };
      }
      if (cell.value == "Shopify") {
        cell.font = {
          bold: true,
        };
      }
    }
  }

  /////////////?CUSTOMER TOTAL ROW?////////////
  rowNo = rowNo + customersData.length + 2;

  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1; //String.fromCharCode(i + colStartAplhaCode);
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }
    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    if (columns[i].alignment) {
      cell.alignment = { horizontal: columns[i].alignment };
    }
    cell.font = {
      bold: true,
    };
    if (columns[i].key == "name") {
      cell.value = "Total";
    } else {
      let sum = sumBy(customersData, columns[i].key);
      cell.value = columns[i].formatValue ? columns[i].formatValue(sum) : sum;
    }
  }
  //////////SHOPIFY ROW//////
  // rowNo = rowNo + 4;

  // for (let i = 0; i < columns.length; i++) {
  //   let colAlpha = String.fromCharCode(i + colStartAplhaCode);
  //   if (columns[i].width) {
  //     const Col = sheet.getColumn(colAlpha);
  //     Col.width = columns[i].width;
  //   }
  //   let cell = sheet.getCell(`${colAlpha}${rowNo}`);

  //   cell.font = {
  //     bold: true,
  //   };
  //   if (columns[i].key == "name") {
  //     cell.value = "Shopify Revenue";
  //   } else if (columns[i].key == "MTD_sumUnit") {
  //     cell.value = formatToCurrency(shopifyDataDate["MTD"]);
  //   } else {
  //     cell.value = formatToCurrency(shopifyDataDate[columns[i].key]);
  //   }
  // }
  //////////SHOPIFY ROW (excluding GST)//////
  // rowNo = rowNo + 1;
  // for (let i = 0; i < columns.length; i++) {
  //   let colAlpha = String.fromCharCode(i + colStartAplhaCode);
  //   if (columns[i].width) {
  //     const Col = sheet.getColumn(colAlpha);
  //     Col.width = columns[i].width;
  //   }
  //   let cell = sheet.getCell(`${colAlpha}${rowNo}`);

  //   cell.font = {
  //     bold: true,
  //   };
  //   if (columns[i].key == "name") {
  //     cell.value = "Shopify Revenue(excluding GST)";
  //   } else if (columns[i].key == "MTD_sumUnit") {
  //     cell.value = formatToCurrency(shopifyDataDateExGST["MTD"]);
  //   } else {
  //     cell.value = formatToCurrency(shopifyDataDateExGST[columns[i].key]);
  //   }
  // }
  //////////SHOPIFY ROW (Tax)//////
  //  rowNo = rowNo + 1;
  //  for (let i = 0; i < columns.length; i++) {
  //    if (columns[i].width) {
  //      const Col = sheet.getColumn(columns[i].colAlpha);
  //      Col.width = columns[i].width;
  //    }
  //    let cell = sheet.getCell(`${columns[i].colAlpha}${rowNo}`);

  //    cell.font = {
  //      bold: true,
  //    };
  //    if (columns[i].key == "name") {
  //      cell.value = "Shopify (Tax)";
  //    } else if (columns[i].key == "MTD_sumUnit") {
  //      cell.value = formatToCurrency(shopifyDataDateTax["MTD"]);
  //    } else {
  //      cell.value = formatToCurrency(shopifyDataDateTax[columns[i].key]);
  //    }
  //  }
  ////////

  rowNo = rowNo + 6;

  columns = [
    {
      title: "Product SKU",
      key: "sku",
      width: 35,
    },
    {
      title: "Product Summary",
      key: "name",
      width: 35,
    },
    {
      heading: "MTD",
      title: "MTD",
      key: "MTD_sumUnit",
    },
    {
      title: "Total Revenue Ex GST",
      key: "MTD_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.MTD_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M1.label, title: "Total Units", key: "M1", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M1_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M1_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M2.label, title: "Total Units", key: "M2", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M2_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M2_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M3.label, title: "Total Units", key: "M3", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M3_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M3_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M4.label, title: "Total Units", key: "M4", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M4_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M4_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M5.label, title: "Total Units", key: "M5", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M5_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M5_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M6.label, title: "Total Units", key: "M6", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M6_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M6_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M7.label, title: "Total Units", key: "M7", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M7_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M7_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M8.label, title: "Total Units", key: "M8", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M8_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M8_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M9.label, title: "Total Units", key: "M9", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M9_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M9_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M10.label, title: "Total Units", key: "M10", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M10_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M10_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M11.label, title: "Total Units", key: "M11", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M11_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M11_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M12.label, title: "Total Units", key: "M12", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M12_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M12_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    // { colAlpha: "C", title: "Last Month", key: "lastMonth_sumUnit", width: 20 },
    // { colAlpha: "D", title: "30 Days", key: "D30_sumUnit" },
    // { colAlpha: "E", title: "60 Days", key: "D60_sumUnit" },
    // { colAlpha: "F", title: "90 Days", key: "D90_sumUnit" },
  ];

  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1;
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }
    if (columns[i].heading) {
      const row = sheet.getRow(rowNo - 1);
      sheet.mergeCells(rowNo - 1, colAlpha, rowNo - 1, colAlpha + 1);
      let cell = row.getCell(colAlpha);
      cell.value = columns[i].heading;
      cell.alignment = { horizontal: "center" };
      cell.font = {
        bold: true,
      };
    }
    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    cell.value = columns[i].title;
    cell.font = {
      bold: true,
    };
  }
  for (let j = 0; j < productsData.length; j++) {
    for (let i = 0; i < columns.length; i++) {
      let colAlpha = i + 1;
      const row = sheet.getRow(rowNo + j + 1);
      let cell = row.getCell(colAlpha);
      cell.value = columns[i].getValue
        ? columns[i].getValue(productsData[j])
        : productsData[j][columns[i].key];
      if (columns[i].alignment) {
        cell.alignment = { horizontal: columns[i].alignment };
      }
    }
  }
  rowNo = rowNo + productsData.length + 2;
  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1;
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }
    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    if (columns[i].alignment) {
      cell.alignment = { horizontal: columns[i].alignment };
    }
    cell.font = {
      bold: true,
    };
    if (columns[i].key == "name") {
      cell.value = "Total";
    } else {
      let sum = sumBy(productsData, columns[i].key);
      cell.value = columns[i].formatValue ? columns[i].formatValue(sum) : sum;
    }
  }

  const sheet1 = workbook.addWorksheet("Detail");
  rowNo = 1;
  columns = [
    {
      colAlpha: "A",
      title: "Customer Name",
      key: "cname",
      width: 25,
    },
    {
      colAlpha: "B",
      title: "Product",
      key: "pname",
      width: 25,
    },
    {
      colAlpha: "C",
      title: "MTD",
      key: "MTD_sumUnit",
    },
    { colAlpha: "D", title: _dates.M1.label, key: "M1", width: 15 },
    { colAlpha: "E", title: _dates.M2.label, key: "M2", width: 15 },
    { colAlpha: "F", title: _dates.M3.label, key: "M3", width: 15 },
    { colAlpha: "G", title: _dates.M4.label, key: "M4", width: 15 },
    { colAlpha: "H", title: _dates.M5.label, key: "M5", width: 15 },
    { colAlpha: "I", title: _dates.M6.label, key: "M6", width: 15 },
    { colAlpha: "J", title: _dates.M7.label, key: "M7", width: 15 },
    { colAlpha: "K", title: _dates.M8.label, key: "M8", width: 15 },
    { colAlpha: "L", title: _dates.M9.label, key: "M9", width: 15 },
    { colAlpha: "M", title: _dates.M10.label, key: "M10", width: 15 },
    { colAlpha: "N", title: _dates.M11.label, key: "M11", width: 15 },
    { colAlpha: "O", title: _dates.M12.label, key: "M12", width: 15 },
    // { colAlpha: "D", title: "Last Month", key: "lastMonth_sumUnit", width: 20 },
    // { colAlpha: "E", title: "30 Days", key: "D30_sumUnit" },
    // { colAlpha: "F", title: "60 Days", key: "D60_sumUnit" },
    // { colAlpha: "G", title: "90 Days", key: "D90_sumUnit" },
  ];

  for (let i = 0; i < columns.length; i++) {
    if (columns[i].width) {
      const Col = sheet1.getColumn(columns[i].colAlpha);
      Col.width = columns[i].width;
    }
    let cell = sheet1.getCell(`${columns[i].colAlpha}${rowNo}`);
    cell.value = columns[i].title;
    cell.font = {
      bold: true,
    };
  }
  for (let j = 0; j < CustomerProductData.length; j++) {
    for (let i = 0; i < columns.length; i++) {
      sheet1.getCell(`${columns[i].colAlpha}${rowNo + j + 1}`).value =
        CustomerProductData[j][columns[i].key];
    }
  }
  rowNo = rowNo + CustomerProductData.length + 2;
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].width) {
      const Col = sheet1.getColumn(columns[i].colAlpha);
      Col.width = columns[i].width;
    }
    let cell = sheet1.getCell(`${columns[i].colAlpha}${rowNo}`);

    cell.font = {
      bold: true,
    };
    if (columns[i].key == "cname") {
      cell.value = "";
    } else if (columns[i].key == "pname") {
      cell.value = "Total";
    } else {
      cell.value = sumBy(CustomerProductData, columns[i].key);
    }
  }

  let exfilename = `kik_final_salesorder_report`; //_${new Date().getTime()}`;
  // filename = `uhp_prods_1679411095707`;
  let exFilePath = path.resolve("download-files", `${exfilename}.xlsx`);

  await workbook.xlsx.writeFile(exFilePath);
  console.log(exfilename, " xlsx created..");
  if (!isDev) {
    let title = "KIKai Unit Sales Report";
    if (teelixir) {
      title = "Teelixir Unit Sales Report";
    }

    sendMail(exFilePath, title);
  }
};
exports.getKIKSalesOrders = async (teelixir = true) => {
  // if (truncate) await truncateTable();
  console.log("Fetching metadata.....");
  let limit = 200;
  let finalData = [];
  //   let res = await bigCommerce
  //   .get(`/hooks`)
  //   .catch(console.log);
  // console.log(res);return

  const hash = SHA256(
    "",
    "a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=="
  );
  const hash64 = Base64.stringify(hash);
  console.log(hash64);

  // let url = `https://api.unleashedsoftware.com/SalesOrders/Page/${1}`;
  let url = `https://api.unleashedsoftware.com/SalesOrders/Page/${1}`;
  let headers = {
    "api-auth-id": "336a6015-eae0-43ab-83eb-e08121e7655d",
    "api-auth-signature": "WCUznpqFg/OOuHsIzNEboWyZOz9zrLby3zbi62ew2sE=",

    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (teelixir) {
    headers = {
      ...headers,
      //teelixir
      "api-auth-id": "7fda9404-7197-477b-89b1-dadbcefae168",
      "api-auth-signature": hash64,
    };
  }

  const { data } = await axios.get(url, {
    headers: headers,
  });
  let metaData = data.Pagination;

  console.log(metaData);
  // return;

  if (metaData) {
    let total_pages = metaData.NumberOfPages; //Math.ceil(metaData.meta.pagination.total_pages / limit);
    console.log("total_pages:", total_pages);
    bar1.start(total_pages, 0);
    for (let j = 1; j <= total_pages; j++) {
      // console.log("pages", i, total_pages);
      let url = `https://api.unleashedsoftware.com/SalesOrders/Page/${j}`;

      const { data: res } = await axios.get(url, {
        headers: headers,
      });
      if (res?.Items) {
        // let total_products = res.data.length;
        finalData = finalData.concat(res.Items);
        let filename = `kik_salesorder_${limit}_${j}`; //_${new Date().getTime()}`;
        // filename = `uhp_prods_1679411095707`;
        let jsonFilePath = path.resolve("download-files", `${filename}.json`);
        //json file ////////
        fs.writeFileSync(jsonFilePath, JSON.stringify(res.Items));
        ////////
        let dataChunks = lodash.chunk(res.Items, 50);
        let totalChunks = dataChunks.length;

        // for (let i = 0; i < totalChunks; i++) {
        //   let dataRow = dataChunks[i];
        //   // console.log(dataRow)
        //   await Promise.allSettled(
        //     dataRow.map((row) => {
        //       // return insertProduct(row);
        //     })
        //   );
        // }

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

  let filename = `kik_final_salesorder`; //_${new Date().getTime()}`;
  if (teelixir) {
    writeJsonFile("teelixir_final_sales_orders", finalData);
  }
  // filename = `uhp_prods_1679411095707`;
  let jsonFilePath = path.resolve("download-files", `${filename}.json`);
  //json file ////////
  fs.writeFileSync(jsonFilePath, JSON.stringify(finalData));
  console.log("download Success kik_final_salesorder");
  return finalData;
};

// require('@shopify/shopify-api/adapters/node')
// const {shopifyApi, LATEST_API_VERSION}=require('@shopify/shopify-api')
const { createAdminRestApiClient } = require("@shopify/admin-api-client");
let shopifyCache = {};
let shopifyProductCache = {};
function insertOrder(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM shopify_orders WHERE order_id = ?",
      [d.id]
    );
    let isExist = !!results.length;
    let fields = `order_id=?,customer_id=?,first_name=?,last_name=?,phone=?,email=?,	date_created=?,	date_modified	=?,date_shipped	=?,status_id=?,	status=?,	items_total=?,	items	=?,subtotal_inc_tax	=?,shipping_cost_inc_tax=?,	handling_cost_inc_tax	=?,total_inc_tax=?`;
    let sql = isExist
      ? `UPDATE shopify_orders SET ${fields} where order_id=?`
      : `INSERT INTO shopify_orders SET ${fields}`;

    let line_items = [];
    for (const r of d.line_items || []) {
      let _detail = await getShopifyProductDetail(r.product_id);
      line_items.push({
        product_id: r.product_id || r.sku,
        name: r.name,
        sku: r.sku,
        quantity: r.current_quantity,
        total_inc_tax: parseFloat(r.price) * r.current_quantity,
        price_inc_tax: r.price,
        handle: _detail?.handle,
        // _detail,
      });
    }

    let items = JSON.stringify(
      line_items
      // (d.line_items || []).map((r) => {
      //   return {
      //     product_id: r.product_id || r.sku,
      //     name: r.name,
      //     sku: r.sku,
      //     quantity: r.current_quantity,
      //     total_inc_tax: parseFloat(r.price) * r.current_quantity,
      //     price_inc_tax: r.price,
      //   };
      // })
    );
    // console.log(d.consignments?.[0]?.shipping)
    let result1 = await query(sql, [
      d.id,
      d.customer?.id || "",
      d.customer?.first_name || d.billing_address?.first_name || "",
      d.customer?.last_name || d.billing_address?.last_name || "",
      d.customer?.phone || d.billing_address?.phone || "",
      d.customer?.email || d.billing_address?.email || "",
      d.created_at ? moment(d.created_at).format("YYYY-MM-DD HH:mm:ss") : null,
      d.updated_at ? moment(d.updated_at).format("YYYY-MM-DD HH:mm:ss") : null,
      d.processed_at
        ? moment(d.processed_at).format("YYYY-MM-DD HH:mm:ss")
        : null,

      0, //status_id
      d.fulfillment_status,
      items.length,
      items,
      d.current_subtotal_price,
      0, // d.shipping_cost_inc_tax,
      0, //d.current_total_tax,
      d.current_total_price,

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

const getShopifyOrdersPaging = async (params, page, arr) => {
  const client = createAdminRestApiClient({
    storeDomain: "teelixir.com.au",
    apiVersion: "2024-01",
    accessToken: "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",
  });
  const response = await client.get("orders", {
    searchParams: {
      status: "any",
      limit: 250,
      // created_at_min: "2023-05-01",
      // created_at_max: "2023-05-31",
      ...params,
      // since_id:666
    },
  });

  const body = await response.json();
  if (!response.ok) {
    //const body = await response.json();
    console.log("rest body", body);
  }
  let orders = body?.orders || [];
  arr = arr.concat(orders);
  console.log(
    "rest response.ok",
    page,
    response.ok,
    arr.length,
    orders.length,
    params
  );
  if (orders.length) {
    // writeJsonFile('s-order-'+page,orders)

    let dataChunks = lodash.chunk(orders, 50);
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

    writeJsonFile("shopify-order-last-page-no", params?.since_id || 1);

    arr = await getShopifyOrdersPaging(
      { since_id: orders[orders.length - 1].id },
      page + 1,
      arr
    );
    // shopifyOrders = shopifyOrders.concat(nextorders);
  }

  return arr;
};
exports.getShopifyOrdersPaging = getShopifyOrdersPaging;

const getShopifyProductDetail = async (id) => {
  try {
    if (!id) {
      return null;
    }
    if (shopifyProductCache[id]) {
      return shopifyProductCache[id];
    }
    const client = createAdminRestApiClient({
      storeDomain: "teelixir.com.au",
      apiVersion: "2024-01",
      accessToken: "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",
    });
    const response = await client.get(`products/${id}`, {
      // searchParams: {
      //   // status: "any",
      //   // limit: 1,
      //   // id:9090212561171
      // },
    });

    const body = await response.json();
    // console.log(id, body.product);

    shopifyProductCache[id] = body?.product;

    return body?.product;
  } catch {
    console.log("ERROR getShopifyProductDetail", id);
  }
};
exports.getShopifyProductDetail = getShopifyProductDetail;
exports.getAllShopifyOrders = async () => {
  let since_id = readJsonFile("shopify-order-last-page-no") || 1;
  await getShopifyOrdersPaging(
    {
      since_id: since_id,
    },
    1,
    []
  );
  writeJsonFile(
    "shopifyProductCache",
    Object.values(shopifyProductCache).filter(Boolean)
  );
  console.log("--___-----_____SUCCESS_____-------___--");
};

const getShopifyOrders = async (params, page, arr, dates = []) => {
  const client = createAdminRestApiClient({
    storeDomain: "teelixir.com.au",
    apiVersion: "2024-01",
    accessToken: "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",
  });
  // console.log('client',client)
  let finalArray = [];
  for (const index in dates) {
    const date = { ...dates[index] };
    date.from = moment(date.from).subtract(1, "day").format("YYYY-MM-DD");
    date.to = moment(date.to).add(1, "day").format("YYYY-MM-DD");

    let orders = [];
    let cacheKey = `${date.from}-${date.to}`;
    if (index != 0 && shopifyCache[cacheKey]) {
      finalArray = finalArray.concat(shopifyCache[cacheKey]);
      console.log(
        "Shopify fetch- shopifyCache",
        date.from,
        date.to,
        shopifyCache[cacheKey].length,
        cacheKey
      );
    } else {
      const response = await client.get("orders", {
        searchParams: {
          status: "any",
          limit: 250,
          created_at_min: date.from, // new Date("2024-03-24"),
          created_at_max: date.to,
          fields:
            "line_items,created_at,id,order_number,name,subtotal_price,total_tax,customer",
          ...params,
          // since_id:666
        },
      });

      const body = await response.json();
      if (!response.ok) {
        //const body = await response.json();
        console.log("rest body", body);
      }
      orders = body?.orders || [];
      console.log(
        "Shopify fetch-",
        date.from,
        date.to,
        orders.length,
        cacheKey
      );
      finalArray = finalArray.concat(orders);

      shopifyCache[cacheKey] = orders;
    }
  }

  return finalArray;
};

exports.getShopifyOrders = getShopifyOrders;
exports.generateKIKSalesUnitReport = async (data, teelixir = true) => {
  let _dates = {};
  _dates.YTD = {
    from: moment().startOf("year").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
    label: "YTD",
  };
  _dates.MTD = {
    from: moment().startOf("month").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
    label: "MTD",
  };
  _dates.lastMonth = {
    from: moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
    to: moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
    label: "Last Month",
  };

  _dates.M1 = getLastMonth(1);
  _dates.M2 = getLastMonth(2);
  _dates.M3 = getLastMonth(3);
  _dates.M4 = getLastMonth(4);
  _dates.M5 = getLastMonth(5);
  _dates.M6 = getLastMonth(6);
  _dates.M7 = getLastMonth(7);
  _dates.M8 = getLastMonth(8);
  _dates.M9 = getLastMonth(9);
  _dates.M10 = getLastMonth(10);
  _dates.M11 = getLastMonth(11);
  _dates.M12 = getLastMonth(12);

  _dates.D30 = {
    from: moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
    label: "D30",
  };

  _dates.D60 = {
    from: moment().subtract(60, "day").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
    label: "D60",
  };

  _dates.D90 = {
    from: moment().subtract(90, "day").format("YYYY-MM-DD"),
    to: moment().format("YYYY-MM-DD"),
    label: "D90",
  };
  // console.log(_dates, [
  //   _dates.MTD,
  //   _dates.M1,
  //   _dates.M2,
  //   _dates.M3,
  //   _dates.M4,
  //   _dates.M5,
  //   _dates.M6,
  //   _dates.M7,
  //   _dates.M8,
  //   _dates.M9,
  //   _dates.M10,
  //   _dates.M11,
  //   _dates.M12,
  // ]);
  // return;

  // data = require("../../download-files/kik_final_salesorder.json");
  // console.log(data.length,Array.from(new Set( data.map(d=>d.OrderStatus))),Array.from(new Set( data.map(d=>d.CreatedBy))));
  // [
  //   'colette@teelixir.com',
  //   'Shopify',
  //   'accounts@kikaimarkets.com',
  //   'jayson@fyic.com.au'
  // ]
  // (r) => r.OrderStatus == "Completed" && ["Shopify"].includes( r.CreatedBy)
  //  let tfrom = moment("2024-03-01");
  //   let tto = moment("2024-03-26");
  //   let orderDate=moment(moment("2024-03-26T15:24:16+11:00").format('YYYY-MM-DD'))
  // console.log("2024-03-26T15:24:16+11:00",orderDate,orderDate.isSameOrAfter(tfrom) , orderDate.isSameOrBefore(tto))
  // return
  // data = [];

  let shopifyOrders = [];
  if (teelixir) {
    if (isDev) {
      shopifyOrders = require("../../download-files/kik_shopify_orders.json");
    } else {
      shopifyOrders = await getShopifyOrders(
        {},
        1,
        [],
        [
          _dates.MTD,
          _dates.M1,
          _dates.M2,
          _dates.M3,
          _dates.M4,
          _dates.M5,
          _dates.M6,
          _dates.M7,
          _dates.M8,
          _dates.M9,
          _dates.M10,
          _dates.M11,
          _dates.M12,
        ]
      );
    }
    console.log("shopifyOrders", shopifyOrders.length);
  }

  ////////////////
  /////////////
  // shopifyOrders = shopifyOrders.filter((d) => {
  //   let orderDate = moment(moment(d.created_at).format("YYYY-MM-DD"));
  //   let from = moment("2024-03-01");
  //   let to = moment("2024-03-26");

  //   return orderDate.isSameOrAfter(from) && orderDate.isSameOrBefore(to); //.isBetween(from, to);
  // });

  // let uniq = Array.from(new Set(shopifyOrders.map((d) => d.order_number)));
  // console.log("shopifyOrders date filter,", shopifyOrders.length, uniq.length);

  // // shopifyOrders = shopifyOrders.concat(orders);

  // let counters = shopifyOrders.reduce((s, r) => {
  //   return {
  //     ...s,
  //     [r.order_number]: {
  //       id: r.id,
  //       created_at: r.created_at,
  //       count: (s[r.order_number]?.count || 0) + 1,
  //     },
  //   };
  // }, {});

  let filename1 = `kik_shopify_orders`; //_${new Date().getTime()}`;

  let jsonFilePath1 = path.resolve("download-files", `${filename1}.json`);
  // /////////\\\\\/ json file ////////
  // if (isDev) {
  //   fs.writeFileSync(jsonFilePath1, JSON.stringify(shopifyOrders));
  // }
  // return;
  //////////////////
  ////////////////

  if (false) {
    let from = _dates.M1.from;
    let to = _dates.M1.to;
    let _from = moment(from).utc();
    let _to = moment(to).utc();

    data = data.filter((d) => {
      let orderDate = moment(
        moment(d[dateProps]).utc().format("YYYY-MM-DD")
      ).utc();

      // console.log(from,_from.format("YYYY-MM-DD"),orderDate.format("YYYY-MM-DD"),to,_to.format("YYYY-MM-DD"),orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to))

      return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to);
    });
    console.log("data filter", from, to, data.length);

    shopifyOrders = shopifyOrders.filter((d) => {
      let orderDate = moment(moment(d.created_at).format("YYYY-MM-DD")); //.utc();

      // console.log(from,_from.format("YYYY-MM-DD"),orderDate.format("YYYY-MM-DD"),to,_to.format("YYYY-MM-DD"),orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to))

      return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to);
    });

    console.log("shopifyOrders filter", from, to, shopifyOrders.length);
  }
  //////
  data = data.filter((r) => r.OrderStatus == "Completed");
  //////

  // console.log("data filter map dates", data.map(d=>moment( parseKIKDate( d[dateProps])).format('YYYY-MM-DD')).join());

  // return;
  let shopifyData = data.filter((r) => ["Shopify"].includes(r.CreatedBy));
  // (r) => r.OrderStatus == "Completed" && ["Shopify"].includes(r.CreatedBy)
  let withOutShopifyData = data.filter(
    (r) => !["Shopify"].includes(r.CreatedBy)
  );
  // r.OrderStatus == "Completed" && !["Shopify"].includes(r.CreatedBy)

  // data = data.filter((r) => r.CreatedBy != "Shopify");

  // console.log("shopifyData--",shopifyData.length, shopifyData.map(d=>d.OrderNumber).join(' | '));
  // console.log("withOutShopifyData--", withOutShopifyData.map(d=>d.OrderNumber).join(' | '));
  // return

  let shopifyFinalDataOri = analyzeShopifySalesData(shopifyOrders);

  let shopifyFinalData = shopifyFinalDataOri;
  let withOutShopifyFinalData = analyzeSalesData(withOutShopifyData);
  let finalData = [...shopifyFinalDataOri, ...withOutShopifyFinalData];
  if (!teelixir) {
    shopifyFinalData = analyzeSalesData(shopifyData);
    finalData = analyzeSalesData(data);
  }

  ////// only unleashed
  shopifyFinalData = analyzeSalesData(shopifyData);
  finalData = analyzeSalesData(data);
  /////////

  //////// only unleashed shopify
  // shopifyFinalData = analyzeSalesData(shopifyData);
  // withOutShopifyFinalData = [];
  // finalData = shopifyFinalData;
  ///////////

  //////ONLY SHOPIFY=====
  // shopifyFinalData=shopifyFinalDataOri
  // withOutShopifyFinalData=[]
  // finalData =shopifyFinalDataOri
  /////////////////////////
  // let r= getTotalUnit(finalData,_dates.M1.from,_dates.M1.to)

  let filename = `kik_final_salesorder_data`; //_${new Date().getTime()}`;

  let jsonFilePath = path.resolve("download-files", `${filename}.json`);
  /////////\\\\\/ json file ////////
  fs.writeFileSync(jsonFilePath, JSON.stringify(data));

  console.log("Success");

  writeCSVFile(
    "finalreportsale",
    finalData.map((r) => {
      return {
        orderNumber: r.orderNumber,
        totalQty: r.totalQty,
        orderDate: r.orderDate,
        status: r.status,
        dateFormat: moment(r.orderDate).format("YYYY-MM-DD hh:mm A"),
        dateFormatUtc: moment(r.orderDate).utc().format("YYYY-MM-DD hh:mm A"),
        KIKDate: r[dateProps],
      };
    })
  );
  // console.log("Success");
  // return;
  ///generate filter dates/////

  ///////////////
  ////////////
  // let mm = getTotalUnit(shopifyFinalData, _dates.M1.from, _dates.M1.to);

  // console.log("total unit", mm);
  // return;
  ///////////////
  ///////////////

  ///generate customer data/////
  let customersData = getTotalUnitByCustomers(
    withOutShopifyFinalData,
    _dates,
    shopifyFinalData
  );
  // console.log(customersData);
  let productsData = getTotalUnitByProducts(finalData, _dates);
  // console.log(productsData);

  let CustomerProductData = getTotalUnitByCustomerProduct(finalData, _dates);
  // console.log(CustomerProductData);
  // jsonFilePath = path.resolve("download-files", `testdata.json`);
  // fs.writeFileSync(jsonFilePath, JSON.stringify(CustomerProductData));

  ///generate total unit data/////
  let yearTarget = 100000;
  let monthTarget = Math.round(yearTarget / 12);

  let MTD_sumUnit = getTotalUnit(finalData, _dates.MTD.from, _dates.MTD.to);
  let MTD_rev = getTotalRevenue(
    finalData,
    _dates.MTD.from,
    _dates.MTD.to,
    "SubTotal"
  );

  let lastMonth_sumUnit = getTotalUnit(finalData, _dates.M1.from, _dates.M1.to);
  let LastMonth_rev = getTotalRevenue(
    finalData,
    _dates.M1.from,
    _dates.M1.to,
    "SubTotal"
  );
  // console.log("lastMonth_sumUnit", lastMonth_sumUnit);
  let M2_sumUnit = getTotalUnit(finalData, _dates.M2.from, _dates.M2.to);
  let M2_rev = getTotalRevenue(
    finalData,
    _dates.M2.from,
    _dates.M2.to,
    "SubTotal"
  );

  let YTD_sumUnit = getTotalUnit(finalData, _dates.YTD.from, _dates.YTD.to);
  let YTD_rev = getTotalRevenue(
    finalData,
    _dates.YTD.from,
    _dates.YTD.to,
    "SubTotal"
  );
  ///generate excel file/////
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Summary - Unit Sold");

  sheet.getCell("A1").value = "Month to Date (MTD)";
  sheet.getCell("A1").font = {
    bold: true,
  };
  sheet.getCell("B1").value = "Total Units";
  sheet.getCell("B1").font = {
    bold: true,
  };
  sheet.getCell("C1").value = "Total Revenue Ex GST";
  sheet.getCell("C1").font = {
    bold: true,
  };
  sheet.getCell("D1").value = "Progress";
  sheet.getCell("D1").font = {
    bold: true,
  };
  sheet.getCell("E1").value = "Gap";
  sheet.getCell("E1").font = {
    bold: true,
  };

  sheet.getCell("A2").value = "MTD";
  sheet.getCell("B2").value = MTD_sumUnit;
  sheet.getCell("C2").value = formatToCurrency(MTD_rev);
  sheet.getCell("C2").alignment = { horizontal: "right" };
  sheet.getCell("D2").value = `${Math.round(
    (MTD_sumUnit / monthTarget) * 100
  )}%`;
  sheet.getCell("D2").alignment = { horizontal: "right" };
  sheet.getCell("E2").value = Math.max(0, monthTarget - MTD_sumUnit);

  sheet.getCell("A3").value = "Last Month";
  sheet.getCell("B3").value = lastMonth_sumUnit;
  sheet.getCell("C3").value = formatToCurrency(LastMonth_rev);
  sheet.getCell("C3").alignment = { horizontal: "right" };
  sheet.getCell("D3").value = `${Math.round(
    (lastMonth_sumUnit / monthTarget) * 100
  )}%`;
  sheet.getCell("D3").alignment = { horizontal: "right" };
  sheet.getCell("E3").value = Math.max(0, monthTarget - lastMonth_sumUnit);

  sheet.getCell("A4").value = "Month Before";
  sheet.getCell("B4").value = M2_sumUnit;
  sheet.getCell("C4").value = formatToCurrency(M2_rev);
  sheet.getCell("C4").alignment = { horizontal: "right" };
  sheet.getCell("D4").value = `${Math.round(
    (M2_sumUnit / monthTarget) * 100
  )}%`;
  sheet.getCell("D4").alignment = { horizontal: "right" };
  sheet.getCell("E4").value = Math.max(0, monthTarget - M2_sumUnit);

  sheet.getCell("A5").value = "Calender YTD";
  sheet.getCell("B5").value = YTD_sumUnit;
  sheet.getCell("C5").value = formatToCurrency(YTD_rev);
  sheet.getCell("C5").alignment = { horizontal: "right" };
  sheet.getCell("D5").value = `${Math.round(
    (YTD_sumUnit / yearTarget) * 100
  )}%`;
  sheet.getCell("D5").alignment = { horizontal: "right" };
  sheet.getCell("E5").value = Math.max(0, yearTarget - YTD_sumUnit);

  //////////////
  sheet.getCell("A7").value = `${moment().year()} Target`;
  sheet.getCell("A7").font = {
    bold: true,
  };
  sheet.getCell("A8").value = "Monthly Target";
  sheet.getCell("B8").value = monthTarget;
  sheet.getCell("A8").font = {
    bold: true,
  };
  sheet.getCell("B8").font = {
    bold: true,
  };

  sheet.getCell("A9").value = "Annual Target";
  sheet.getCell("B9").value = yearTarget;
  sheet.getCell("A9").font = {
    bold: true,
  };
  sheet.getCell("B9").font = {
    bold: true,
  };
  //////////////CUSTOMER TABLE//////////////////////////
  let columns = [
    {
      title: "Customer Name",
      key: "name",
      width: 25,
    },
    {
      heading: "MTD",
      title: "Total Units",
      key: "MTD_sumUnit",
    },
    {
      title: "Total Revenue Ex GST",
      key: "MTD_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.MTD_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M1.label, title: "Total Units", key: "M1", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M1_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M1_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M2.label, title: "Total Units", key: "M2", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M2_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M2_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M3.label, title: "Total Units", key: "M3", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M3_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M3_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M4.label, title: "Total Units", key: "M4", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M4_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M4_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M5.label, title: "Total Units", key: "M5", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M5_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M5_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M6.label, title: "Total Units", key: "M6", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M6_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M6_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M7.label, title: "Total Units", key: "M7", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M7_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M7_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M8.label, title: "Total Units", key: "M8", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M8_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M8_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M9.label, title: "Total Units", key: "M9", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M9_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M9_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M10.label, title: "Total Units", key: "M10", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M10_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M10_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M11.label, title: "Total Units", key: "M11", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M11_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M11_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M12.label, title: "Total Units", key: "M12", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M12_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M12_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    // {  title: "Last Month", key: "lastMonth_sumUnit", width: 20 },
    // {  title: "30 Days", key: "D30_sumUnit" },
    // {  title: "60 Days", key: "D60_sumUnit" },
    // {  title: "90 Days", key: "D90_sumUnit" },
  ];
  let rowNo = 12;
  let colStartAplhaCode = 65;
  /////////////?CUSTOMER COL?////////////
  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1; //String.fromCharCode(i + colStartAplhaCode);
    // console.log(colAlpha)
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }

    if (columns[i].heading) {
      const row = sheet.getRow(rowNo - 1);
      sheet.mergeCells(rowNo - 1, colAlpha, rowNo - 1, colAlpha + 1);
      let cell = row.getCell(colAlpha);
      cell.value = columns[i].heading;

      cell.alignment = { horizontal: "center" };
      // cell.fill = {
      //   type: 'pattern',
      //   pattern:'solid',
      //   fgColor:{argb:i%3?'FFFFF9B7':'FFFFF26B'},
      //   bgColor:{argb:i%2?'FFFFF9B7':'FFFFF26B'},
      // };
      cell.font = {
        bold: true,
      };
    }

    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    cell.value = columns[i].title;
    cell.font = {
      bold: true,
    };
  }
  /////////////?CUSTOMER ROWS?////////////
  for (let j = 0; j < customersData.length; j++) {
    for (let i = 0; i < columns.length; i++) {
      let colAlpha = i + 1; //String.fromCharCode(i + colStartAplhaCode);
      const row = sheet.getRow(rowNo + j + 1);
      let cell = row.getCell(colAlpha);

      cell.value = columns[i].getValue
        ? columns[i].getValue(customersData[j])
        : customersData[j][columns[i].key];
      if (columns[i].alignment) {
        cell.alignment = { horizontal: columns[i].alignment };
      }
      if (cell.value == "Shopify") {
        cell.font = {
          bold: true,
        };
      }
    }
  }

  /////////////?CUSTOMER TOTAL ROW?////////////
  rowNo = rowNo + customersData.length + 2;

  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1; //String.fromCharCode(i + colStartAplhaCode);
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }
    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    if (columns[i].alignment) {
      cell.alignment = { horizontal: columns[i].alignment };
    }
    cell.font = {
      bold: true,
    };
    if (columns[i].key == "name") {
      cell.value = "Total";
    } else {
      let sum = sumBy(customersData, columns[i].key);
      cell.value = columns[i].formatValue ? columns[i].formatValue(sum) : sum;
    }
  }
  //////////SHOPIFY ROW//////
  // rowNo = rowNo + 4;

  // for (let i = 0; i < columns.length; i++) {
  //   let colAlpha = String.fromCharCode(i + colStartAplhaCode);
  //   if (columns[i].width) {
  //     const Col = sheet.getColumn(colAlpha);
  //     Col.width = columns[i].width;
  //   }
  //   let cell = sheet.getCell(`${colAlpha}${rowNo}`);

  //   cell.font = {
  //     bold: true,
  //   };
  //   if (columns[i].key == "name") {
  //     cell.value = "Shopify Revenue";
  //   } else if (columns[i].key == "MTD_sumUnit") {
  //     cell.value = formatToCurrency(shopifyDataDate["MTD"]);
  //   } else {
  //     cell.value = formatToCurrency(shopifyDataDate[columns[i].key]);
  //   }
  // }
  //////////SHOPIFY ROW (excluding GST)//////
  // rowNo = rowNo + 1;
  // for (let i = 0; i < columns.length; i++) {
  //   let colAlpha = String.fromCharCode(i + colStartAplhaCode);
  //   if (columns[i].width) {
  //     const Col = sheet.getColumn(colAlpha);
  //     Col.width = columns[i].width;
  //   }
  //   let cell = sheet.getCell(`${colAlpha}${rowNo}`);

  //   cell.font = {
  //     bold: true,
  //   };
  //   if (columns[i].key == "name") {
  //     cell.value = "Shopify Revenue(excluding GST)";
  //   } else if (columns[i].key == "MTD_sumUnit") {
  //     cell.value = formatToCurrency(shopifyDataDateExGST["MTD"]);
  //   } else {
  //     cell.value = formatToCurrency(shopifyDataDateExGST[columns[i].key]);
  //   }
  // }
  //////////SHOPIFY ROW (Tax)//////
  //  rowNo = rowNo + 1;
  //  for (let i = 0; i < columns.length; i++) {
  //    if (columns[i].width) {
  //      const Col = sheet.getColumn(columns[i].colAlpha);
  //      Col.width = columns[i].width;
  //    }
  //    let cell = sheet.getCell(`${columns[i].colAlpha}${rowNo}`);

  //    cell.font = {
  //      bold: true,
  //    };
  //    if (columns[i].key == "name") {
  //      cell.value = "Shopify (Tax)";
  //    } else if (columns[i].key == "MTD_sumUnit") {
  //      cell.value = formatToCurrency(shopifyDataDateTax["MTD"]);
  //    } else {
  //      cell.value = formatToCurrency(shopifyDataDateTax[columns[i].key]);
  //    }
  //  }
  ////////

  rowNo = rowNo + 6;

  columns = [
    {
      title: "Product SKU",
      key: "sku",
      width: 35,
    },
    {
      title: "Product Summary",
      key: "name",
      width: 35,
    },
    {
      heading: "MTD",
      title: "MTD",
      key: "MTD_sumUnit",
    },
    {
      title: "Total Revenue Ex GST",
      key: "MTD_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.MTD_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M1.label, title: "Total Units", key: "M1", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M1_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M1_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M2.label, title: "Total Units", key: "M2", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M2_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M2_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M3.label, title: "Total Units", key: "M3", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M3_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M3_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M4.label, title: "Total Units", key: "M4", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M4_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M4_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M5.label, title: "Total Units", key: "M5", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M5_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M5_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M6.label, title: "Total Units", key: "M6", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M6_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M6_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M7.label, title: "Total Units", key: "M7", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M7_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M7_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M8.label, title: "Total Units", key: "M8", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M8_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M8_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M9.label, title: "Total Units", key: "M9", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M9_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M9_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M10.label, title: "Total Units", key: "M10", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M10_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M10_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M11.label, title: "Total Units", key: "M11", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M11_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M11_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    { heading: _dates.M12.label, title: "Total Units", key: "M12", width: 15 },
    {
      title: "Total Revenue Ex GST",
      key: "M12_ex_rev",
      width: 20,
      alignment: "right",
      getValue: (data) => {
        return formatToCurrency(data.M12_ex_rev);
      },
      formatValue: (data) => {
        return formatToCurrency(data);
      },
    },
    // { colAlpha: "C", title: "Last Month", key: "lastMonth_sumUnit", width: 20 },
    // { colAlpha: "D", title: "30 Days", key: "D30_sumUnit" },
    // { colAlpha: "E", title: "60 Days", key: "D60_sumUnit" },
    // { colAlpha: "F", title: "90 Days", key: "D90_sumUnit" },
  ];

  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1;
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }
    if (columns[i].heading) {
      const row = sheet.getRow(rowNo - 1);
      sheet.mergeCells(rowNo - 1, colAlpha, rowNo - 1, colAlpha + 1);
      let cell = row.getCell(colAlpha);
      cell.value = columns[i].heading;
      cell.alignment = { horizontal: "center" };
      cell.font = {
        bold: true,
      };
    }
    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    cell.value = columns[i].title;
    cell.font = {
      bold: true,
    };
  }
  for (let j = 0; j < productsData.length; j++) {
    for (let i = 0; i < columns.length; i++) {
      let colAlpha = i + 1;
      const row = sheet.getRow(rowNo + j + 1);
      let cell = row.getCell(colAlpha);
      cell.value = columns[i].getValue
        ? columns[i].getValue(productsData[j])
        : productsData[j][columns[i].key];
      if (columns[i].alignment) {
        cell.alignment = { horizontal: columns[i].alignment };
      }
    }
  }
  rowNo = rowNo + productsData.length + 2;
  for (let i = 0; i < columns.length; i++) {
    let colAlpha = i + 1;
    if (columns[i].width) {
      const Col = sheet.getColumn(colAlpha);
      Col.width = columns[i].width;
    }
    const row = sheet.getRow(rowNo);
    let cell = row.getCell(colAlpha);
    if (columns[i].alignment) {
      cell.alignment = { horizontal: columns[i].alignment };
    }
    cell.font = {
      bold: true,
    };
    if (columns[i].key == "name") {
      cell.value = "Total";
    } else {
      let sum = sumBy(productsData, columns[i].key);
      cell.value = columns[i].formatValue ? columns[i].formatValue(sum) : sum;
    }
  }

  const sheet1 = workbook.addWorksheet("Detail");
  rowNo = 1;
  columns = [
    {
      colAlpha: "A",
      title: "Customer Name",
      key: "cname",
      width: 25,
    },
    {
      colAlpha: "B",
      title: "Product",
      key: "pname",
      width: 25,
    },
    {
      colAlpha: "C",
      title: "MTD",
      key: "MTD_sumUnit",
    },
    { colAlpha: "D", title: _dates.M1.label, key: "M1", width: 15 },
    { colAlpha: "E", title: _dates.M2.label, key: "M2", width: 15 },
    { colAlpha: "F", title: _dates.M3.label, key: "M3", width: 15 },
    { colAlpha: "G", title: _dates.M4.label, key: "M4", width: 15 },
    { colAlpha: "H", title: _dates.M5.label, key: "M5", width: 15 },
    { colAlpha: "I", title: _dates.M6.label, key: "M6", width: 15 },
    { colAlpha: "J", title: _dates.M7.label, key: "M7", width: 15 },
    { colAlpha: "K", title: _dates.M8.label, key: "M8", width: 15 },
    { colAlpha: "L", title: _dates.M9.label, key: "M9", width: 15 },
    { colAlpha: "M", title: _dates.M10.label, key: "M10", width: 15 },
    { colAlpha: "N", title: _dates.M11.label, key: "M11", width: 15 },
    { colAlpha: "O", title: _dates.M12.label, key: "M12", width: 15 },
    // { colAlpha: "D", title: "Last Month", key: "lastMonth_sumUnit", width: 20 },
    // { colAlpha: "E", title: "30 Days", key: "D30_sumUnit" },
    // { colAlpha: "F", title: "60 Days", key: "D60_sumUnit" },
    // { colAlpha: "G", title: "90 Days", key: "D90_sumUnit" },
  ];

  for (let i = 0; i < columns.length; i++) {
    if (columns[i].width) {
      const Col = sheet1.getColumn(columns[i].colAlpha);
      Col.width = columns[i].width;
    }
    let cell = sheet1.getCell(`${columns[i].colAlpha}${rowNo}`);
    cell.value = columns[i].title;
    cell.font = {
      bold: true,
    };
  }
  for (let j = 0; j < CustomerProductData.length; j++) {
    for (let i = 0; i < columns.length; i++) {
      sheet1.getCell(`${columns[i].colAlpha}${rowNo + j + 1}`).value =
        CustomerProductData[j][columns[i].key];
    }
  }
  rowNo = rowNo + CustomerProductData.length + 2;
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].width) {
      const Col = sheet1.getColumn(columns[i].colAlpha);
      Col.width = columns[i].width;
    }
    let cell = sheet1.getCell(`${columns[i].colAlpha}${rowNo}`);

    cell.font = {
      bold: true,
    };
    if (columns[i].key == "cname") {
      cell.value = "";
    } else if (columns[i].key == "pname") {
      cell.value = "Total";
    } else {
      cell.value = sumBy(CustomerProductData, columns[i].key);
    }
  }

  let exfilename = `kik_final_salesorder_report`; //_${new Date().getTime()}`;
  // filename = `uhp_prods_1679411095707`;
  let exFilePath = path.resolve("download-files", `${exfilename}.xlsx`);

  await workbook.xlsx.writeFile(exFilePath);
  console.log(exfilename, " xlsx created..");
  if (!isDev) {
    let title = "KIKai Unit Sales Report";
    if (teelixir) {
      title = "Teelixir Unit Sales Report";
    }

    sendMail(exFilePath, title);
  }
};

function analyzeShopifySalesData(data) {
  let finalData = [];
  for (const item of data) {
    // console.log(item.SalesOrderLines.length);

    let exist = finalData.find((r) => r.orderID == item.id);
    if (exist) {
      continue;
    }
    let totalQty = item.line_items.reduce((s, d) => {
      return s + parseInt(d.current_quantity);
    }, 0);

    let products = item.line_items.map((d) => {
      return {
        id: d.id,
        sku: d.sku || d.name,
        name: d.name,
        qty: d.current_quantity,
        Total: parseFloat(d.price) * d.current_quantity,
      };
    });

    let odata = {
      orderID: item.id,
      orderNumber: item.order_number,
      totalQty,
      [dateProps]: `/Date(${new Date(item.created_at).getTime()})/`,
      Total: parseFloat(item.subtotal_price), // parseFloat(item.total_price),
      SubTotal: parseFloat(item.subtotal_price) - parseFloat(item.total_tax), //total_line_items_price
      CreatedBy: "Shopify",
      orderDate: item.created_at,
      products,
      customer: {
        id: item.customer.id,
        code: item.customer.email,
        name: `${item.customer.first_name} ${item.customer.last_name}`,
      },
    };
    finalData.push(odata);
  }
  return finalData;
}

function analyzeSalesData(data) {
  let finalData = [];
  for (const item of data) {
    // console.log(item.SalesOrderLines.length);
    let totalQty = item.SalesOrderLines.reduce((s, d) => {
      let tqty = parseInt(d.OrderQuantity);
      if (!d.Product.ProductCode) {
        tqty = 0;
      }

      return s + tqty;
    }, 0);

    let products = item.SalesOrderLines.map((d) => {
      return {
        id: d.Product.Guid,
        sku: d.Product.ProductCode,
        name: d.Product.ProductDescription,
        qty: d.OrderQuantity,
        Total: d.LineTotal,
      };
    });
    // console.log('------------------eeee   date',item.OrderStatus,item.OrderNumber,item[dateProps])
    let odata = {
      status: item.OrderStatus,
      orderNumber: item.OrderNumber,
      totalQty,
      [dateProps]: item[dateProps],
      Total: item.Total,
      SubTotal: item.SubTotal,
      CreatedBy: item.CreatedBy,
      orderDate: parseKIKDate(item[dateProps]),
      products,
      customer: {
        id: item.Customer.Guid,
        code: item.Customer.CustomerCode,
        name: item.Customer.CustomerName,
      },
    };
    finalData.push(odata);
  }
  return finalData;
}

function analyzeSalesInvoiceData(data) {
  let finalData = [];
  for (const item of data) {
    // console.log(item.SalesOrderLines.length);
    let totalQty = item.InvoiceLines.reduce((s, d) => {
      let tqty = parseInt(d.InvoiceQuantity);
      if (!d.Product.ProductCode) {
        tqty = 0;
      }

      return s + tqty;

      // return s + parseInt(d.InvoiceQuantity);
    }, 0);

    let products = item.InvoiceLines.map((d) => {
      return {
        id: d.Product.Guid,
        sku: d.Product.ProductCode,
        name: d.Product.ProductDescription,
        qty: d.InvoiceQuantity,
        Total: d.LineTotal,
      };
    });

    let odata = {
      status: item.InvoiceStatus,
      orderNumber: item.OrderNumber,
      InvoiceNumber: item.InvoiceNumber,
      totalQty,
      [dateProps]: item[dateProps],
      Total: item.Total,
      SubTotal: item.SubTotal,
      CreatedBy: item.CreatedBy,
      orderDate: parseKIKDate(item[dateProps]),
      products,
      customer: {
        id: item.Customer.Guid,
        code: item.Customer.CustomerCode,
        name: item.Customer.CustomerName,
      },
    };
    finalData.push(odata);
  }
  return finalData;
}

function getShopifyRevenue(finalData, _dates, props = "Total") {
  // console.log(_dates);

  let data = Object.keys(_dates).reduce((s, key) => {
    let d = _dates[key];

    let total = getTotalRevenue(finalData, d.from, d.to, props);

    return { ...s, [key]: total };
  }, {});
  // console.log(data);
  return data;
}
function getSalesUnitByDates(
  customerRecords,
  _dates,
  subTotalProp = "SubTotal"
) {
  let MTD_sumUnit = getTotalUnit(
    customerRecords,
    _dates.MTD.from,
    _dates.MTD.to
  );
  let MTD_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.MTD.from,
    _dates.MTD.to,
    subTotalProp
  );
  // console.log("MTD_sumUnit", MTD_sumUnit);

  // let D30_sumUnit = getTotalUnit(
  //   customerRecords,
  //   _dates.D30.from,
  //   _dates.D30.to
  // );
  // let D30_ex_rev = getTotalRevenue(
  //   customerRecords,
  //   _dates.D30.from,
  //   _dates.D30.to,
  //   subTotalProp
  // );
  // // console.log("D30_sumUnit", D30_sumUnit);

  // let D60_sumUnit = getTotalUnit(
  //   customerRecords,
  //   _dates.D60.from,
  //   _dates.D60.to
  // );
  // let D60_ex_rev = getTotalRevenue(
  //   customerRecords,
  //   _dates.D60.from,
  //   _dates.D60.to,
  //   subTotalProp
  // );
  // // console.log("D60_sumUnit", D60_sumUnit);

  // let D90_sumUnit = getTotalUnit(
  //   customerRecords,
  //   _dates.D90.from,
  //   _dates.D90.to
  // );
  // let D90_ex_rev = getTotalRevenue(
  //   customerRecords,
  //   _dates.D90.from,
  //   _dates.D90.to,
  //   subTotalProp
  // );
  // // console.log("D90_sumUnit", D90_sumUnit);

  // let lastMonth_sumUnit = getTotalUnit(
  //   customerRecords,
  //   _dates.lastMonth.from,
  //   _dates.lastMonth.to
  // );
  // let lastMonth_ex_rev = getTotalRevenue(
  //   customerRecords,
  //   _dates.lastMonth.from,
  //   _dates.lastMonth.to,
  //   subTotalProp
  // );
  let M1 = getTotalUnit(customerRecords, _dates.M1.from, _dates.M1.to);
  let M1_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M1.from,
    _dates.M1.to,
    subTotalProp
  );

  let M2 = getTotalUnit(customerRecords, _dates.M2.from, _dates.M2.to);
  let M2_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M2.from,
    _dates.M2.to,
    subTotalProp
  );
  let M3 = getTotalUnit(customerRecords, _dates.M3.from, _dates.M3.to);
  let M3_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M3.from,
    _dates.M3.to,
    subTotalProp
  );
  let M4 = getTotalUnit(customerRecords, _dates.M4.from, _dates.M4.to);
  let M4_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M4.from,
    _dates.M4.to,
    subTotalProp
  );
  let M5 = getTotalUnit(customerRecords, _dates.M5.from, _dates.M5.to);
  let M5_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M5.from,
    _dates.M5.to,
    subTotalProp
  );
  let M6 = getTotalUnit(customerRecords, _dates.M6.from, _dates.M6.to);
  let M6_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M6.from,
    _dates.M6.to,
    subTotalProp
  );
  let M7 = getTotalUnit(customerRecords, _dates.M7.from, _dates.M7.to);
  let M7_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M7.from,
    _dates.M7.to,
    subTotalProp
  );
  let M8 = getTotalUnit(customerRecords, _dates.M8.from, _dates.M8.to);
  let M8_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M8.from,
    _dates.M8.to,
    subTotalProp
  );
  let M9 = getTotalUnit(customerRecords, _dates.M9.from, _dates.M9.to);
  let M9_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M9.from,
    _dates.M9.to,
    subTotalProp
  );
  let M10 = getTotalUnit(customerRecords, _dates.M10.from, _dates.M10.to);
  let M10_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M10.from,
    _dates.M10.to,
    subTotalProp
  );
  let M11 = getTotalUnit(customerRecords, _dates.M11.from, _dates.M11.to);
  let M11_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M11.from,
    _dates.M11.to,
    subTotalProp
  );
  let M12 = getTotalUnit(customerRecords, _dates.M12.from, _dates.M12.to);
  let M12_ex_rev = getTotalRevenue(
    customerRecords,
    _dates.M12.from,
    _dates.M12.to,
    subTotalProp
  );

  return {
    MTD_sumUnit,
    MTD_ex_rev,
    // D30_sumUnit,
    // D30_ex_rev,
    // D60_sumUnit,
    // D60_ex_rev,
    // D90_sumUnit,
    // D90_ex_rev,
    // lastMonth_sumUnit,
    // lastMonth_ex_rev,
    M1,
    M1_ex_rev,
    M2,
    M2_ex_rev,
    M3,
    M3_ex_rev,
    M4,
    M4_ex_rev,
    M5,
    M5_ex_rev,
    M6,
    M6_ex_rev,
    M7,
    M7_ex_rev,
    M8,
    M8_ex_rev,
    M9,
    M9_ex_rev,
    M10,
    M10_ex_rev,
    M11,
    M11_ex_rev,
    M12,
    M12_ex_rev,
  };
}
function validateDateData(data) {
  return Object.values(data).every((v) => v == "0");
}

function getTotalUnitByCustomers(finalData, _dates, shopifyFinalData) {
  let customersData = finalData.reduce((r, d) => {
    if (!r[d.customer?.id]) {
      let customer = d.customer;
      let customerRecords = finalData.filter(
        (f) => f.customer?.id == customer?.id
      );

      let dateData = getSalesUnitByDates(customerRecords, _dates);
      if (validateDateData(dateData)) {
        return r;
      }

      return {
        ...r,
        [customer?.id]: {
          ...customer,
          ...dateData,
          // orders: customerRecords.map(e=>({orderNumber:e.orderNumber,totalQty:e.totalQty,orderDate:e.orderDate})),
          // totalQty,
          // totalOrders: customerRecords.length,
        },
      };
    }
    return r;
  }, {});
  let dateData = getSalesUnitByDates(shopifyFinalData, _dates);
  // customersData["shopify_id"] = {
  //   id: "shopify_id",
  //   code: "shopify_code",
  //   name: "Shopify",
  //   ...dateData,
  // };

  let arr = Object.values(customersData).sort((a, b) => {
    return b.M1 - a.M1;
  });

  // console.log(dateData)
  arr.push({
    id: "shopify_id",
    code: "shopify_code",
    name: "Shopify",
    ...dateData,
  });

  return arr;
}

function getTotalUnitByProducts(finalData, _dates) {
  let prop = "sku";
  let productsData = finalData.reduce((r, d) => {
    let products = d.products;
    let uniProducts = products.reduce((s, p, i) => {
      if (!r[p[prop]]) {
        let pRecords = finalData
          .filter((f) => {
            return f.products.find((pp) => pp[prop] == p[prop]);
          })
          .map((f) => {
            let _products = f.products.filter((pp) => pp[prop] == p[prop]);
            let qty = _products.reduce((ss, dd) => {
              return ss + dd.qty;
            }, 0);
            let Total = _products.reduce((ss, dd) => {
              return ss + dd.Total;
            }, 0);

            return {
              ...f,
              totalQty: qty,
              products: _products,
              productsCount: _products.length,
              ProductTotal: Total,
            };
          });
        // if(p.sku=='REI-100'){
        //   console.log(pRecords)
        // }
        let dateData = getSalesUnitByDates(pRecords, _dates, "ProductTotal");
        // console.log(pRecords);
        if (validateDateData(dateData)) {
          return r;
        }

        return {
          ...s,
          [p[prop]]: {
            ...p,
            ...dateData,
            // orders: pRecords.map((e) => ({
            //   orderNumber: e.orderNumber,
            //   totalQty: e.totalQty,
            //   orderDate: e.orderDate,
            //   products: e.products,
            //   productsCount:e.productsCount
            // })),
          },
        };
      }
      return s;
    }, {});

    return { ...r, ...uniProducts };
  }, {});
  // return productsData
  return Object.values(productsData).sort((a, b) => {
    return b.M1 - a.M1;
  });
}

function getTotalUnitByCustomerProduct(finalData, _dates) {
  let productsData = finalData.reduce((r, d) => {
    let customer = d.customer;
    let products = d.products;

    let groupdata = products.reduce((s, p) => {
      let id = `${customer.id}_${p.id}`;

      if (!r[id]) {
        let pRecords = finalData
          .filter((f) => {
            return f.products.find((pp) => {
              let _id = `${f.customer.id}_${pp.id}`;
              return id == _id;
            });
          })
          .map((f) => {
            let _products = f.products.filter((pp) => pp.id == p.id);
            let qty = _products.reduce((ss, dd) => {
              return ss + dd.qty;
            }, 0);

            return {
              ...f,
              totalQty: qty,
              products: _products,
              productsCount: _products.length,
            };
          });
        let dateData = getSalesUnitByDates(pRecords, _dates);
        if (validateDateData(dateData)) {
          return r;
        }

        return {
          ...s,
          [id]: {
            pid: p.id,
            cid: customer.id,
            pname: p.name,
            cname: customer.name,
            ...dateData,
            // orders: pRecords.map((e) => ({
            //   orderNumber: e.orderNumber,
            //   totalQty: e.totalQty,
            //   orderDate: e.orderDate,
            //   products: e.products,
            //   productsCount:e.productsCount
            // })),
          },
        };
      }
      return s;
    }, {});

    return { ...r, ...groupdata };
  }, {});

  let pData = Object.values(productsData); //.filter((s) => s.list.length > 1);

  return pData.sort((a, b) => {
    return b.M1 - a.M1;
  });
}

function getTotalRevenue(finalData, from, to, props = "Total") {
  let _from = moment(from).utc();
  let _to = moment(to).utc();

  let filterData = finalData.filter((d) => {
    let orderDate = moment(
      moment(d.orderDate).utc().format("YYYY-MM-DD")
    ).utc();

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });
  // console.log(filterData)
  let sumUnit = filterData.reduce((s, d) => {
    return s + parseFloat(d[props]);
  }, 0);
  // console.log(
  //   filterData.map((d) => moment(d.orderDate).format("YYYY-MM-DD")).join(" | ")
  // );
  // console.log(filterData.map((d) => d.totalQty).join(" | "));
  return sumUnit;
}

function getTotalUnit(finalData, from, to) {
  let _from = moment(from).utc();
  let _to = moment(to).utc();

  let filterData = finalData.filter((d) => {
    let orderDate = moment(
      moment(d.orderDate).utc().format("YYYY-MM-DD")
    ).utc();

    // console.log(from,_from.format("YYYY-MM-DD"),orderDate.format("YYYY-MM-DD"),to,_to.format("YYYY-MM-DD"),orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to))

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });

  let sumUnit = filterData.reduce((s, d) => {
    return s + parseInt(d.totalQty);
  }, 0);
  // console.log('units--',sumUnit,from,to,filterData.length)

  return sumUnit;
}

function parseKIKDate(date) {
  if (!date) {
    return "";
  }
  return new Date(
    parseInt(date.slice(date.indexOf("(") + 1, date.lastIndexOf(")")))
  );
}

exports.parseKIKDate = parseKIKDate;

function sendMail(filepath, title) {
  let pathToAttachment = filepath;
  let attachment = fs.readFileSync(pathToAttachment).toString("base64");

  console.log("sending... mail");
  sgMail
    .send({
      to: [
        { email: "jayson@kikaimarkets.com" },
        {
          email: "moudgill1193@gmail.com",
        },

        { email: "peter@kikaimarkets.com" },
        { email: "colette@kikaimarkets.com" },
        { email: "julze@teelixir.com" },
        { email: "richard@teelixir.com" },
        { email: "admin@teelixir.com" },
      ], // Change to your recipient
      from: {
        email: "noreply@findyouridealcustomers.com.au",
        name: title,
      }, // Change to your verified sender
      subject: `${title} | ${moment().format("dddd - DD MMM YYYY hh:mm A")}`,
      text: "Find attachment",
      // html: "<strong></strong>",
      attachments: [
        {
          content: attachment,
          filename: `sales_report_${moment().format(
            "DD-MM-YYYY hh:mm A"
          )}.xlsx`,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
// console.log(`kk | ${moment().format("dddd - DD MMM YYYY hh:mm A")}`)

function sumBy(arr, key) {
  return arr.reduce((s, r) => {
    return s + parseFloat(r[key]);
  }, 0);
}

function formatToCurrency(no) {
  // return no
  return parseFloat(no)
    .toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      // useGrouping:false
      // currencySign:"A"
    })
    .replace("$", "$ ");
}

async function getBillOfMaterialStockAnalysis(from, to) {
  let kikProducts = readJsonFile("kik_all_products"); //require("../download-files/kik_all_products.json");
  let kikPStock = readJsonFile("kik_stock_all_products"); //require("../download-files/cron/kikps.json");
  let kikBillOfMat = readJsonFile("kik_billofmat_all_products"); //require("../download-files/cron/kik_billofMat.json");
  let kikSales = readJsonFile("teelixir_final_sales_invoices");
  let query = getMySqlQuery();
  let results = await query("SELECT * FROM teelixir_stock_on_hand");
  let tableData = results.reduce((d, r) => {
    return { ...d, [r.product_code]: r.product_group };
  }, {});
  // let days = 30;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let days = moment(date.to).diff(moment(date.from), "day");

  kikSales = kikSales.filter((d) => {
    let idate = parseKIKDate(d.InvoiceDate);
    let _from = moment(date.from).utc();
    let _to = moment(date.to).utc();
    let orderDate = moment(moment(idate).utc().format("YYYY-MM-DD")).utc();

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });

  // kikProducts = kikProducts.filter(
  //   (r) => r.ProductGroup?.GroupName == "Raw Materials"
  // );
  // let GroupNames = Array.from(
  //   new Set(kikProducts.map((d) => d.ProductGroup?.GroupName))
  // );
  //////////
  ///////PRODUCT TEST /////////////
  // let kikSalesProduct = kikSales
  //   .reduce((r, d) => {
  //     let t = d.InvoiceLines.find((p) => p.Product.ProductCode == "MAT-100");
  //     if (t) {
  //       return [...r, d];
  //     }
  //     return [...r];
  //   }, [])
  //   .map((d) => {
  //     let t = d.InvoiceLines.find((p) => p.Product.ProductCode == "MAT-100");
  //     let idate = parseKIKDate(d.InvoiceDate);
  //     return {
  //       InvoiceNumber: d.InvoiceNumber,
  //       InvoiceDate: d.InvoiceDate,
  //       InvoiceStatus: d.InvoiceStatus,
  //       OrderQuantity: t?.OrderQuantity,
  //       InvoiceQuantity: t?.InvoiceQuantity,
  //       date: moment(idate).utc().format("YYYY-MM-DD"),
  //       idate: idate,
  //     };
  //   });

  // let totalQty = kikSalesProduct.reduce((s, a) => {
  //   return s + a.InvoiceQuantity || 0;
  // }, 0);
  // console.log("totalQty---", totalQty);
  // // writeJsonFile("saleskik-", kikSales);

  // console.log("count", kikSalesProduct.length);
  // return kikSalesProduct;
  /////////////////
  //////////////////////////
  kikProducts = kikProducts.map((d) => {
    // kikSales
    let sales = kikSales
      .filter((inv) => {
        return inv.InvoiceLines.find((b) => b.Product.Guid == d.Guid);
      })
      .map((w) => {
        let p = w.InvoiceLines.filter((b) => b.Product.Guid == d.Guid);
        let qty = p.reduce((s, a) => {
          return s + a.InvoiceQuantity || 0;
        }, 0);
        return {
          InvoiceNumber: w.InvoiceNumber,
          InvoiceDate: parseKIKDate(w.InvoiceDate),
          InvoiceQuantity: qty,
        };
      });

    let TotalInvoiceQuantity = sales.reduce((s, r) => {
      return s + r.InvoiceQuantity;
    }, 0);

    let stock = kikPStock.find((s) => {
      return s.ProductGuid == d.Guid;
    });

    let BillOfMaterials = kikBillOfMat
      .filter((r) => {
        return r.BillOfMaterialsLines.find((b) => b.Product.Guid == d.Guid);
      })
      .map((b) => {
        return {
          BillNumber: b.BillNumber,

          ProductCode: b.Product.ProductCode,
          ProductDescription: b.Product.ProductDescription,
          UnitOfMeasure: b.Product.UnitOfMeasure?.Name || "",
          ProductGroup: b.Product.ProductGroup?.GroupName,
          Guid: b.Product.Guid,

          BillOfMaterialsLines: b.BillOfMaterialsLines.map((a) => {
            let stock1 = kikPStock.find((s) => {
              return s.ProductGuid == a.Product.Guid;
            });
            let AvailableQty1 = stock1?.AvailableQty || 0;
            let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
            // let nextDays1 = Math.floor(
            //   days * (AvailableQty1 / TotalInvoiceQuantity1)
            // );

            if (a.Product.Guid == d.Guid) {
              return null;
            }

            return {
              ProductCode: a.Product.ProductCode,
              ProductDescription: a.Product.ProductDescription,
              UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
              ProductGroup: a.Product.ProductGroup?.GroupName,
              Guid: a.Product.Guid,
              Quantity: a.Quantity,
              AllocatedQty: stock1?.AllocatedQty || 0,
              QtyOnHand: stock1?.QtyOnHand || 0,
              OnPurchase: stock1?.OnPurchase || 0,
              AvailableQty: AvailableQty1,
              TotalInvoiceQuantity: TotalInvoiceQuantity1,
              // nextDays: nextDays1,
            };
          }).filter(Boolean),
        };
      });

    let assembleProduct = kikBillOfMat.find((r) => r.Product?.Guid == d.Guid);

    if (assembleProduct) {
      assembleProduct = {
        BillNumber: assembleProduct.BillNumber,

        ProductCode: assembleProduct.Product.ProductCode,
        ProductDescription: assembleProduct.Product.ProductDescription,
        UnitOfMeasure: assembleProduct.Product.UnitOfMeasure?.Name || "",
        ProductGroup: assembleProduct.Product.ProductGroup?.GroupName,
        Guid: assembleProduct.Product.Guid,

        BillOfMaterialsLines: assembleProduct.BillOfMaterialsLines.map((a) => {
          let stock1 = kikPStock.find((s) => {
            return s.ProductGuid == a.Product.Guid;
          });
          let AvailableQty1 = stock1?.AvailableQty || 0;
          let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
          // let nextDays1 = Math.floor(
          //   days * (AvailableQty1 / TotalInvoiceQuantity1)
          // );

          return {
            ProductCode: a.Product.ProductCode,
            ProductDescription: a.Product.ProductDescription,
            UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
            ProductGroup: a.Product.ProductGroup?.GroupName,
            Guid: a.Product.Guid,
            Quantity: a.Quantity,
            AllocatedQty: stock1?.AllocatedQty || 0,
            QtyOnHand: stock1?.QtyOnHand || 0,
            OnPurchase: stock1?.OnPurchase || 0,
            AvailableQty: AvailableQty1,
            TotalInvoiceQuantity: TotalInvoiceQuantity1,
            // nextDays: nextDays1,
          };
        }),
      };
    }

    let AvailableQty = stock?.AvailableQty || 0;
    // let nextDays = Math.floor(days * (AvailableQty / TotalInvoiceQuantity));

    return {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure?.Name || "",
      ProductGroup: d.ProductGroup?.GroupName,
      Guid: d.Guid,
      AllocatedQty: stock?.AllocatedQty || 0,
      QtyOnHand: stock?.QtyOnHand || 0,
      OnPurchase: stock?.OnPurchase || 0,
      AvailableQty: AvailableQty,
      TotalInvoiceQuantity,
      // nextDays,
      assembleProduct,
      // sales,
      BillOfMaterials,
      //test
      BillOfMaterials: [],
      assembleProduct: null,
    };
  });
  //.filter((r) => r.BillOfMaterials.length && r.TotalInvoiceQuantity);
  //.filter((r) => r.sales.length);
  // return kikProducts;
  console.log("after", kikProducts.length);
  let billofMatProducts = kikProducts.reduce((arr, d) => {
    let ps1 = d?.assembleProduct?.BillOfMaterialsLines || [];

    let ps = d.BillOfMaterials.reduce((arr1, d1) => {
      let BillOfMaterialsLines = d1.BillOfMaterialsLines;

      return [...arr1, ...BillOfMaterialsLines];
    }, []);
    let prod = {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure,
      ProductGroup: d.ProductGroup,
      Guid: d.Guid,
      AllocatedQty: d?.AllocatedQty || 0,
      QtyOnHand: d?.QtyOnHand || 0,
      OnPurchase: d?.OnPurchase || 0,
      AvailableQty: d.AvailableQty || 0,
      TotalInvoiceQuantity: d.TotalInvoiceQuantity,
      parent: true,
    };
    return [...arr, prod, ...ps, ...ps1];
  }, []);

  let uniqueP = Array.from(new Set(billofMatProducts.map((r) => r.Guid)));

  let finalData = uniqueP.map((g) => {
    let pp = billofMatProducts.find((d) => d.Guid == g);
    let invQty = billofMatProducts
      .filter((d) => d.Guid == g)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);

    let nextDays = Math.floor(days * (pp.AvailableQty / invQty));

    return {
      ...pp,
      TotalInvoiceQuantity: invQty,
      nextDays: nextDays || 0,
      ProductGroup_edited: tableData[pp.ProductCode],
    };
  });

  // writeJsonFile("cron/g", kikProducts);
  // writeJsonFile("cron/gbill", billofMatProducts);
  // writeCSVFile(`billofMaterial_${date.from}-${date.to}`, finalData);
  console.log("Success");

  return finalData;
}

exports.getBillOfMaterialStockAnalysis = getBillOfMaterialStockAnalysis;

async function getBillOfMaterialStockOnHand(from, to) {
  let kikProducts = readJsonFile("kik_all_products"); //require("../download-files/kik_all_products.json");
  let kikPStock = readJsonFile("kik_stock_all_products"); //require("../download-files/cron/kikps.json");
  let kikBillOfMat = readJsonFile("kik_billofmat_all_products"); //require("../download-files/cron/kik_billofMat.json");
  let kikSales = readJsonFile("teelixir_final_sales_invoices");
  let query = getMySqlQuery();
  let results = await query("SELECT * FROM teelixir_stock_on_hand");
  let revisedCostData = results.reduce((d, r) => {
    return { ...d, [r.product_code]: r.revised_cost };
  }, {});
  // return revisedCostData;
  // let days = 30;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let days = moment(date.to).diff(moment(date.from), "day");

  kikSales = kikSales.filter((d) => {
    let idate = parseKIKDate(d.InvoiceDate);
    let _from = moment(date.from).utc();
    let _to = moment(date.to).utc();
    let orderDate = moment(moment(idate).utc().format("YYYY-MM-DD")).utc();

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });
  // return kikSales
  // kikProducts = kikProducts.filter(
  //   (r) => r.ProductGroup?.GroupName == "Raw Materials"
  // );
  // let GroupNames = Array.from(
  //   new Set(kikProducts.map((d) => d.ProductGroup?.GroupName))
  // );
  console.log(days, kikProducts.length, kikSales.length);

  kikProducts = kikProducts.map((d) => {
    // kikSales
    let sales = kikSales
      .filter((inv) => {
        return inv.InvoiceLines.find((b) => b.Product.Guid == d.Guid);
      })
      .map((w) => {
        let p = w.InvoiceLines.filter((b) => b.Product.Guid == d.Guid);
        let qty = p.reduce((s, a) => {
          return s + a.InvoiceQuantity || 0;
        }, 0);
        return {
          InvoiceNumber: w.InvoiceNumber,
          InvoiceDate: parseKIKDate(w.InvoiceDate),
          InvoiceQuantity: qty,
        };
      });

    let TotalInvoiceQuantity = sales.reduce((s, r) => {
      return s + r.InvoiceQuantity;
    }, 0);

    let stock = kikPStock.find((s) => {
      return s.ProductGuid == d.Guid;
    });

    let BillOfMaterials = kikBillOfMat
      .filter((r) => {
        return r.BillOfMaterialsLines.find((b) => b.Product.Guid == d.Guid);
      })
      .map((b) => {
        return {
          BillNumber: b.BillNumber,

          ProductCode: b.Product.ProductCode,
          ProductDescription: b.Product.ProductDescription,
          UnitOfMeasure: b.Product.UnitOfMeasure?.Name || "",
          ProductGroup: b.Product.ProductGroup?.GroupName,
          Guid: b.Product.Guid,

          BillOfMaterialsLines: b.BillOfMaterialsLines.map((a) => {
            let stock1 = kikPStock.find((s) => {
              return s.ProductGuid == a.Product.Guid;
            });
            let AvailableQty1 = stock1?.AvailableQty || 0;
            let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
            // let nextDays1 = Math.floor(
            //   days * (AvailableQty1 / TotalInvoiceQuantity1)
            // );

            if (a.Product.Guid == d.Guid) {
              return null;
            }

            return {
              ProductCode: a.Product.ProductCode,
              ProductDescription: a.Product.ProductDescription,
              UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
              ProductGroup: a.Product.ProductGroup?.GroupName,
              Guid: a.Product.Guid,
              Quantity: a.Quantity,
              AllocatedQty: stock1?.AllocatedQty || 0,
              QtyOnHand: stock1?.QtyOnHand || 0,
              AvailableQty: AvailableQty1,
              TotalInvoiceQuantity: TotalInvoiceQuantity1,
              // nextDays: nextDays1,
            };
          }).filter(Boolean),
        };
      });

    let assembleProduct = kikBillOfMat.find((r) => r.Product?.Guid == d.Guid);

    if (assembleProduct) {
      assembleProduct = {
        BillNumber: assembleProduct.BillNumber,

        ProductCode: assembleProduct.Product.ProductCode,
        ProductDescription: assembleProduct.Product.ProductDescription,
        UnitOfMeasure: assembleProduct.Product.UnitOfMeasure?.Name || "",
        ProductGroup: assembleProduct.Product.ProductGroup?.GroupName,
        Guid: assembleProduct.Product.Guid,

        BillOfMaterialsLines: assembleProduct.BillOfMaterialsLines.map((a) => {
          let stock1 = kikPStock.find((s) => {
            return s.ProductGuid == a.Product.Guid;
          });
          let AvailableQty1 = stock1?.AvailableQty || 0;
          let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
          // let nextDays1 = Math.floor(
          //   days * (AvailableQty1 / TotalInvoiceQuantity1)
          // );

          return {
            ProductCode: a.Product.ProductCode,
            ProductDescription: a.Product.ProductDescription,
            UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
            ProductGroup: a.Product.ProductGroup?.GroupName,
            Guid: a.Product.Guid,
            Quantity: a.Quantity,
            AllocatedQty: stock1?.AllocatedQty || 0,
            QtyOnHand: stock1?.QtyOnHand || 0,
            AvailableQty: AvailableQty1,
            TotalInvoiceQuantity: TotalInvoiceQuantity1,
            // nextDays: nextDays1,
          };
        }),
      };
    }

    let AvailableQty = stock?.AvailableQty || 0;
    // let nextDays = Math.floor(days * (AvailableQty / TotalInvoiceQuantity));

    return {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure?.Name || "",
      ProductGroup: d.ProductGroup?.GroupName,
      Guid: d.Guid,
      AllocatedQty: stock?.AllocatedQty || 0,
      QtyOnHand: stock?.QtyOnHand || 0,
      AvailableQty: AvailableQty,
      TotalInvoiceQuantity,
      // nextDays,
      assembleProduct,
      // sales,
      BillOfMaterials,
    };
  });
  // .filter((r) => r.BillOfMaterials.length && r.TotalInvoiceQuantity);
  //.filter((r) => r.sales.length);
  // return kikProducts;
  console.log("after", kikProducts.length);
  let billofMatProducts = kikProducts.reduce((arr, d) => {
    let ps1 = d?.assembleProduct?.BillOfMaterialsLines || [];

    let ps = d.BillOfMaterials.reduce((arr1, d1) => {
      let BillOfMaterialsLines = d1.BillOfMaterialsLines;

      return [...arr1, ...BillOfMaterialsLines];
    }, []);
    let prod = {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure,
      ProductGroup: d.ProductGroup,
      Guid: d.Guid,
      AllocatedQty: d?.AllocatedQty || 0,
      QtyOnHand: d?.QtyOnHand || 0,
      AvailableQty: d.AvailableQty,
      TotalInvoiceQuantity: d.TotalInvoiceQuantity,
      parent: true,
    };
    return [...arr, prod, ...ps, ...ps1];
  }, []);
  // return billofMatProducts;
  let uniqueP = Array.from(new Set(billofMatProducts.map((r) => r.Guid)));
  // return uniqueP;
  let finalData = uniqueP.map((g) => {
    let pp = billofMatProducts.find((d) => d.Guid == g);
    let invQty = billofMatProducts
      .filter((d) => d.Guid == g)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);

    let nextDays = Math.floor(days * (pp.AvailableQty / invQty));

    return {
      ...pp,
      TotalInvoiceQuantity: invQty,
      revisedCost: revisedCostData[pp.ProductCode] || 0,
      nextDays: nextDays || 0,
    };
  });

  // writeJsonFile("cron/g1", kikProducts);
  // writeJsonFile("cron/gbill1", billofMatProducts);
  // writeCSVFile(`billofMaterial_${date.from}-${date.to}`, finalData);
  console.log("Success");

  return finalData;
}

exports.getBillOfMaterialStockOnHand = getBillOfMaterialStockOnHand;

async function getBillOfMaterialAnalysis(from, to) {
  // let kikProducts = readJsonFile("kik_all_products"); //require("../download-files/kik_all_products.json");
  let kikPStock = readJsonFile("kik_stock_all_products"); //require("../download-files/cron/kikps.json");
  let kikBillOfMat = readJsonFile("kik_billofmat_all_products"); //require("../download-files/cron/kik_billofMat.json");
  let kikSales = readJsonFile("teelixir_final_sales_invoices");
  let query = getMySqlQuery();
  let results = await query("SELECT * FROM teelixir_stock_on_hand");

  let tableData = results.reduce((d, r) => {
    return { ...d, [r.product_code]: r.product_group };
  }, {});
  // let days = 30;

  // kikBillOfMat = kikBillOfMat.reduce((d, r) => {
  //   let list = r.BillOfMaterialsLines.map((dd) => {
  //     return {
  //       ...dd,
  //       BillNumber: r.BillNumber,
  //       TotalCost: dd.LineTotalCost,
  //       childItem:true
  //     };
  //   });
  //   return [...d,r, ...list];
  // }, []);

  // return kikBillOfMat

  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let days = moment(date.to).diff(moment(date.from), "day");

  kikSales = kikSales.filter((d) => {
    let idate = parseKIKDate(d.InvoiceDate);
    let _from = moment(date.from).utc();
    let _to = moment(date.to).utc();
    let orderDate = moment(moment(idate).utc().format("YYYY-MM-DD")).utc();

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });

  // kikProducts = kikProducts.filter(
  //   (r) => r.ProductGroup?.GroupName == "Raw Materials"
  // );
  // let GroupNames = Array.from(
  //   new Set(kikProducts.map((d) => d.ProductGroup?.GroupName))
  // );
  console.log(days, kikSales.length);

  let kikBillOfMatWithChild = kikBillOfMat.map((d) => {
    // kikSales
    let sales = kikSales
      .filter((inv) => {
        return inv.InvoiceLines.find((b) => b.Product.Guid == d.Product.Guid);
      })
      .map((w) => {
        let p = w.InvoiceLines.filter((b) => b.Product.Guid == d.Product.Guid);
        let qty = p.reduce((s, a) => {
          return s + a.InvoiceQuantity || 0;
        }, 0);
        return {
          InvoiceNumber: w.InvoiceNumber,
          InvoiceDate: parseKIKDate(w.InvoiceDate),
          InvoiceQuantity: qty,
        };
      });

    let TotalInvoiceQuantity = sales.reduce((s, r) => {
      return s + r.InvoiceQuantity;
    }, 0);

    let stock = kikPStock.find((s) => {
      return s.ProductGuid == d.Product.Guid;
    });

    // let BillOfMaterials = kikBillOfMat
    // .filter((r) => {
    //   return r.BillOfMaterialsLines.find((b) => b.Product.Guid == d.Product.Guid);
    // })
    // .map((b) => {
    //   return {
    //     BillNumber: b.BillNumber,

    //     ProductCode: b.Product.ProductCode,
    //     ProductDescription: b.Product.ProductDescription,
    //     UnitOfMeasure: b.Product.UnitOfMeasure?.Name || "",
    //     ProductGroup: b.Product.ProductGroup?.GroupName,
    //     Guid: b.Product.Guid,

    //     BillOfMaterialsLines: b.BillOfMaterialsLines.map((a) => {
    //       let stock1 = kikPStock.find((s) => {
    //         return s.ProductGuid == a.Product.Guid;
    //       });
    //       let AvailableQty1 = stock1?.AvailableQty || 0;
    //       let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
    //       // let nextDays1 = Math.floor(
    //       //   days * (AvailableQty1 / TotalInvoiceQuantity1)
    //       // );

    //       if (a.Product.Guid == d.Guid) {
    //         return null;
    //       }

    //       return {
    //         ProductCode: a.Product.ProductCode,
    //         ProductDescription: a.Product.ProductDescription,
    //         UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
    //         ProductGroup: a.Product.ProductGroup?.GroupName,
    //         Guid: a.Product.Guid,
    //         Quantity: a.Quantity,
    //         AllocatedQty: stock1?.AllocatedQty || 0,
    //         QtyOnHand: stock1?.QtyOnHand || 0,
    //         AvailableQty: AvailableQty1,
    //         TotalInvoiceQuantity: TotalInvoiceQuantity1,
    //         childItem:true,
    //         // nextDays: nextDays1,
    //       };
    //     }).filter(Boolean),
    //   };
    // });

    let assembleProduct = kikBillOfMat.find(
      (r) => r.Product?.Guid == d.Product.Guid
    );

    if (assembleProduct) {
      assembleProduct = {
        BillNumber: assembleProduct.BillNumber,

        ProductCode: assembleProduct.Product.ProductCode,
        ProductDescription: assembleProduct.Product.ProductDescription,
        UnitOfMeasure: assembleProduct.Product.UnitOfMeasure?.Name || "",
        ProductGroup: assembleProduct.Product.ProductGroup?.GroupName,
        Guid: assembleProduct.Product.Guid,

        BillOfMaterialsLines: assembleProduct.BillOfMaterialsLines.map((a) => {
          let stock1 = kikPStock.find((s) => {
            return s.ProductGuid == a.Product.Guid;
          });
          let AvailableQty1 = stock1?.AvailableQty || 0;
          let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
          // let nextDays1 = Math.floor(
          //   days * (AvailableQty1 / TotalInvoiceQuantity1)
          // );

          return {
            BillNumber: assembleProduct.BillNumber,
            ProductCode: a.Product.ProductCode,
            ProductDescription: a.Product.ProductDescription,
            UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
            ProductGroup: a.Product.ProductGroup?.GroupName,
            Guid: a.Product.Guid,
            Quantity: a.Quantity,
            AllocatedQty: stock1?.AllocatedQty || 0,
            QtyOnHand: stock1?.QtyOnHand || 0,
            AvailableQty: AvailableQty1,
            TotalInvoiceQuantity: TotalInvoiceQuantity1,
            childItem: true,
            ProductGroup_edited: tableData[a.Product.ProductCode],
            // nextDays: nextDays1,
          };
        }),
      };
    }

    let AvailableQty = stock?.AvailableQty || 0;
    // let nextDays = Math.floor(days * (AvailableQty / TotalInvoiceQuantity));

    return {
      ProductCode: d.Product.ProductCode,
      ProductDescription: d.Product.ProductDescription,
      UnitOfMeasure: d.Product.UnitOfMeasure?.Name || "",
      ProductGroup: d.Product.ProductGroup?.GroupName,
      Guid: d.Product.Guid,

      BillNumber: d.BillNumber,

      childItem: d.childItem,

      AllocatedQty: stock?.AllocatedQty || 0,
      QtyOnHand: stock?.QtyOnHand || 0,
      AvailableQty: AvailableQty,
      TotalInvoiceQuantity,
      Quantity: d.Quantity || 0,
      // nextDays
      // nextDays,
      assembleProduct,
      // sales,
      // BillOfMaterials,
      ProductGroup_edited: tableData[d.Product.ProductCode],
    };
  });

  // return kikBillOfMatWithChild;
  let billofMatProducts = kikBillOfMatWithChild.reduce((arr, d) => {
    let ps1 = d?.assembleProduct?.BillOfMaterialsLines || [];

    // let ps = d.BillOfMaterials.reduce((arr1, d1) => {
    //   let BillOfMaterialsLines = d1.BillOfMaterialsLines;

    //   return [...arr1, ...BillOfMaterialsLines];
    // }, []);
    // let prod = {
    //   ProductCode: d.ProductCode,
    //   ProductDescription: d.ProductDescription,
    //   UnitOfMeasure: d.UnitOfMeasure,
    //   ProductGroup: d.ProductGroup,
    //   Guid: d.Guid,
    //   AllocatedQty: d?.AllocatedQty || 0,
    //   QtyOnHand: d?.QtyOnHand || 0,
    //   AvailableQty: d.AvailableQty||0,
    //   TotalInvoiceQuantity: d.TotalInvoiceQuantity,
    //   parent:true
    // };
    let prod = { ...d };
    delete prod.assembleProduct;
    return [...arr, prod, ...ps1];
  }, []);
  return billofMatProducts;
  let uniqueP = Array.from(new Set(kikBillOfMat.map((r) => r.Guid)));

  let finalData = uniqueP.map((g) => {
    let pp = kikBillOfMat.find((d) => d.Guid == g);
    let invQty = kikBillOfMat
      .filter((d) => d.Guid == g)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);

    let nextDays = Math.floor(days * (pp.AvailableQty / invQty));

    return {
      ...pp,
      TotalInvoiceQuantity: invQty,
      nextDays: nextDays || 0,
      // ProductGroup_edited:tableData[pp.ProductCode],
    };
  });

  // writeJsonFile("cron/g", kikProducts);
  // writeJsonFile("cron/gbill", kikBillOfMat);
  // writeCSVFile(`billofMaterial_${date.from}-${date.to}`, finalData);
  console.log("Success");

  return finalData;
}

exports.getBillOfMaterialAnalysis = getBillOfMaterialAnalysis;

async function getBillOfMaterialStockNeeds(from, to) {
  let kikProducts = readJsonFile("kik_all_products"); //require("../download-files/kik_all_products.json");
  let kikPStock = readJsonFile("kik_stock_all_products"); //require("../download-files/cron/kikps.json");
  let kikBillOfMat = readJsonFile("kik_billofmat_all_products"); //require("../download-files/cron/kik_billofMat.json");
  // let kikSales = readJsonFile("teelixir_final_sales_invoices");

  let kikSales = readJsonFile("teelixir_final_sales_orders");

  let query = getMySqlQuery();
  let results = await query("SELECT * FROM teelixir_stock_on_hand");
  let tableData = results.reduce((d, r) => {
    return { ...d, [r.product_code]: r.product_group };
  }, {});
  // let days = 30;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let days = moment(date.to).diff(moment(date.from), "day");

  kikSales = kikSales.filter((d) => {
    if (!d.CompletedDate) {
      return false;
    }

    let idate = parseKIKDate(d.CompletedDate);
    let _from = moment(date.from).utc();
    let _to = moment(date.to).utc();
    let orderDate = moment(moment(idate).utc().format("YYYY-MM-DD")).utc();

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });

  // let sales = kikSales
  // .filter((inv) => {
  //   return inv.SalesOrderLines.find((b) => b.Product.ProductCode == "ASHW-100");
  // })
  // .map((w) => {
  //   let p = w.SalesOrderLines.filter((b) => b.Product.ProductCode == "ASHW-100");
  //   let qty = p.reduce((s, a) => {
  //     return s + a.OrderQuantity || 0;
  //   }, 0);
  //   return {
  //     InvoiceNumber: w.OrderNumber,
  //     InvoiceDate: parseKIKDate(w.CompletedDate),
  //     OrderQuantity: qty,
  //   };
  // });

  // writeCSVFile("cron/gkikSales", sales);
  // kikProducts = kikProducts.filter(
  //   (r) => r.ProductGroup?.GroupName == "Raw Materials"
  // );
  // let GroupNames = Array.from(
  //   new Set(kikProducts.map((d) => d.ProductGroup?.GroupName))
  // );

  // kikProducts=kikBillOfMat.map(r=>{
  //   return r.Product
  // })
  const checkBlendProduct = (p) => {
    return `${p.ProductCode}-${p.ProductDescription}`
      .toLowerCase()
      .includes("blend");
  };
  console.log(days, kikProducts.length, kikSales.length);
  let kikProductsWithChildren = kikProducts.map((d) => {
    let blendProduct = checkBlendProduct(d); //d.ProductCode.includes("-BLEND-");
    let childs = kikBillOfMat.find((r) => r.Product?.Guid == d.Guid);

    if (childs) {
      childs = childs.BillOfMaterialsLines.map((a) => {
        let blendProduct1 = checkBlendProduct(a.Product); //a.Product.ProductCode.includes("-BLEND-");
        /////////////////////////
        if (blendProduct) {
          // blendProduct1 = true;
        }
        /////////////////////////

        // blendProduct1=blendProduct
        return {
          ProductCode: a.Product.ProductCode,
          ProductDescription: a.Product.ProductDescription,
          UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
          ProductGroup: a.Product.ProductGroup?.GroupName,
          Guid: a.Product.Guid,
          Quantity: a.Quantity,
          // AllocatedQty: stock1?.AllocatedQty || 0,
          // QtyOnHand: stock1?.QtyOnHand || 0,
          // AvailableQty: AvailableQty1,
          // TotalInvoiceQuantity: TotalInvoiceQuantity1,
          blendProduct: blendProduct1,
          // nextDays: nextDays1,
        };
      });
    }

    // let AvailableQty = stock?.AvailableQty || 0;
    // let nextDays = Math.floor(days * (AvailableQty / TotalInvoiceQuantity));

    return {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure?.Name || "",
      ProductGroup: d.ProductGroup?.GroupName,
      Guid: d.Guid,
      // AllocatedQty: stock?.AllocatedQty || 0,
      // QtyOnHand: stock?.QtyOnHand || 0,
      // AvailableQty: AvailableQty,
      // TotalInvoiceQuantity,
      // nextDays,
      childs,
      blendProduct,
      // sales,
      // BillOfMaterials,
    };
  });
  //.filter((r) => r.BillOfMaterials.length && r.TotalInvoiceQuantity);
  //.filter((r) => r.sales.length);
  // writeJsonFile("cron/g", kikProductsWithChildren);
  // return kikProductsWithChildren;

  //////////

  kikProducts = kikProducts.map((d) => {
    // kikSales
    let sales = kikSales
      .filter((inv) => {
        return inv.SalesOrderLines.find((b) => b.Product.Guid == d.Guid);
      })
      .map((w) => {
        let p = w.SalesOrderLines.filter((b) => b.Product.Guid == d.Guid);
        let qty = p.reduce((s, a) => {
          return s + a.OrderQuantity || 0;
        }, 0);
        return {
          InvoiceNumber: w.OrderNumber,
          InvoiceDate: parseKIKDate(w.CompletedDate),
          OrderQuantity: qty,
        };
      });

    let TotalInvoiceQuantity = sales.reduce((s, r) => {
      return s + r.OrderQuantity;
    }, 0);

    // let stock = kikPStock.find((s) => {
    //   return s.ProductGuid == d.Guid;
    // });

    // let BillOfMaterials = kikBillOfMat
    //   .filter((r) => {
    //     return r.BillOfMaterialsLines.find((b) => b.Product.Guid == d.Guid);
    //   })
    //   .map((b) => {
    //     return {
    //       BillNumber: b.BillNumber,

    //       ProductCode: b.Product.ProductCode,
    //       ProductDescription: b.Product.ProductDescription,
    //       UnitOfMeasure: b.Product.UnitOfMeasure?.Name || "",
    //       ProductGroup: b.Product.ProductGroup?.GroupName,
    //       Guid: b.Product.Guid,

    //       BillOfMaterialsLines: b.BillOfMaterialsLines.map((a) => {
    //         let stock1 = kikPStock.find((s) => {
    //           return s.ProductGuid == a.Product.Guid;
    //         });
    //         let AvailableQty1 = stock1?.AvailableQty || 0;
    //         let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
    //         // let nextDays1 = Math.floor(
    //         //   days * (AvailableQty1 / TotalInvoiceQuantity1)
    //         // );

    //         if (a.Product.Guid == d.Guid) {
    //           return null;
    //         }

    //         return {
    //           ProductCode: a.Product.ProductCode,
    //           ProductDescription: a.Product.ProductDescription,
    //           UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
    //           ProductGroup: a.Product.ProductGroup?.GroupName,
    //           Guid: a.Product.Guid,
    //           Quantity: a.Quantity,
    //           AllocatedQty: stock1?.AllocatedQty || 0,
    //           QtyOnHand: stock1?.QtyOnHand || 0,
    //           AvailableQty: AvailableQty1,
    //           TotalInvoiceQuantity: TotalInvoiceQuantity1,
    //           // nextDays: nextDays1,
    //         };
    //       }).filter(Boolean),
    //     };
    //   });

    let BillOfMaterials = [];

    let blendProduct = checkBlendProduct(d); //d.ProductCode.includes("-BLEND-");

    let assembleProduct = kikProductsWithChildren.find(
      (r) => r?.Guid == d.Guid
    );
    let assembleProductChilds = [];
    if (assembleProduct && assembleProduct.childs) {
      assembleProductChilds = assembleProduct.childs.reduce((r, a) => {
        // let stock1 = kikPStock.find((s) => {
        //   return s.ProductGuid == a.Guid;
        // });

        let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;

        let blendProduct1 = checkBlendProduct(a); //a.ProductCode.includes("-BLEND-");
        ////////
        if (blendProduct) {
          // blendProduct1 = true;
        }
        //////////
        let obj = {
          ProductCode: a.ProductCode,
          ProductDescription: a.ProductDescription,
          UnitOfMeasure: a.UnitOfMeasure || "",
          ProductGroup: a.ProductGroup || "",
          Guid: a.Guid,
          Quantity: a.Quantity,
          // AllocatedQty: stock1?.AllocatedQty || 0,
          // QtyOnHand: stock1?.QtyOnHand || 0,
          // AvailableQty: stock1?.AvailableQty || 0,
          TotalInvoiceQuantity: TotalInvoiceQuantity1,
          blendProduct: blendProduct1,
          level: 1,
        };
        ////////////LEVEL 1 CHLIDREN//////////////
        let assembleProduct1 = kikProductsWithChildren.find(
          (r1) => r1?.Guid == a.Guid
        );
        let childs1 = [];
        if (assembleProduct1 && assembleProduct1.childs) {
          childs1 = assembleProduct1.childs.map((a1) => {
            let blendProduct2 = checkBlendProduct(a1); //a1.ProductCode.includes("-BLEND-");
            ///////
            if (blendProduct1) {
              // blendProduct2 = true;
            }
            //////
            let TotalInvoiceQuantity2 = TotalInvoiceQuantity1 * a1.Quantity;
            return {
              ProductCode: a1.ProductCode,
              ProductDescription: a1.ProductDescription,
              UnitOfMeasure: a1.UnitOfMeasure || "",
              ProductGroup: a1.ProductGroup || "",
              Guid: a1.Guid,
              Quantity: a1.Quantity,
              // AllocatedQty: stock1?.AllocatedQty || 0,
              // QtyOnHand: stock1?.QtyOnHand || 0,
              // AvailableQty: stock1?.AvailableQty || 0,
              TotalInvoiceQuantity: TotalInvoiceQuantity2,
              blendProduct: blendProduct2,
              level: 2,
            };
          });
        }

        return [...r, obj, ...childs1];
      }, []);
    }

    // if (assembleProduct) {
    //   assembleProduct = {
    //     BillNumber: assembleProduct.BillNumber,

    //     ProductCode: assembleProduct.Product.ProductCode,
    //     ProductDescription: assembleProduct.Product.ProductDescription,
    //     UnitOfMeasure: assembleProduct.Product.UnitOfMeasure?.Name || "",
    //     ProductGroup: assembleProduct.Product.ProductGroup?.GroupName,
    //     Guid: assembleProduct.Product.Guid,

    //     BillOfMaterialsLines: assembleProduct.BillOfMaterialsLines.map((a) => {
    //       let stock1 = kikPStock.find((s) => {
    //         return s.ProductGuid == a.Product.Guid;
    //       });
    //       let AvailableQty1 = stock1?.AvailableQty || 0;
    //       let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
    //       // let nextDays1 = Math.floor(
    //       //   days * (AvailableQty1 / TotalInvoiceQuantity1)
    //       // );
    //       let blendProduct1 = a.Product.ProductCode.includes("-BLEND-");
    //       if (blendProduct) {
    //         blendProduct1 = true;
    //       }
    //       // blendProduct1=blendProduct
    //       return {
    //         ProductCode: a.Product.ProductCode,
    //         ProductDescription: a.Product.ProductDescription,
    //         UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
    //         ProductGroup: a.Product.ProductGroup?.GroupName,
    //         Guid: a.Product.Guid,
    //         Quantity: a.Quantity,
    //         AllocatedQty: stock1?.AllocatedQty || 0,
    //         QtyOnHand: stock1?.QtyOnHand || 0,
    //         AvailableQty: AvailableQty1,
    //         TotalInvoiceQuantity: TotalInvoiceQuantity1,
    //         blendProduct: blendProduct1,
    //         // nextDays: nextDays1,
    //       };
    //     }),
    //   };
    // }

    return {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure?.Name || "",
      ProductGroup: d.ProductGroup?.GroupName,
      Guid: d.Guid,
      // AllocatedQty: stock?.AllocatedQty || 0,
      // QtyOnHand: stock?.QtyOnHand || 0,
      // AvailableQty: stock?.AvailableQty || 0,
      TotalInvoiceQuantity,
      assembleProduct: assembleProductChilds,
      blendProduct,
      level: 0,
    };
  });
  //.filter((r) => r.BillOfMaterials.length && r.TotalInvoiceQuantity);
  //.filter((r) => r.sales.length);
  // writeJsonFile("cron/g", kikProducts);
  // return kikProducts;

  console.log("after", kikProducts.length);
  let billofMatProducts = kikProducts.reduce((arr, d) => {
    let ps1 = d?.assembleProduct || [];

    // let ps = d.BillOfMaterials.reduce((arr1, d1) => {
    //   let BillOfMaterialsLines = d1.BillOfMaterialsLines;

    //   return [...arr1, ...BillOfMaterialsLines];
    // }, []);
    let prod = { ...d };
    delete prod.assembleProduct;

    return [...arr, prod, ...ps1];
  }, []);
  // return billofMatProducts;
  let uniqueP = Array.from(new Set(billofMatProducts.map((r) => r.Guid)));

  let finalData = uniqueP.map((g) => {
    let pp = billofMatProducts.find((d) => d.Guid == g);
    let ppblend = billofMatProducts.find((d) => d.Guid == g && d.blendProduct);
    let invQty = billofMatProducts
      .filter((d) => d.Guid == g && !d.blendProduct)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);

    let invQtyBlend = billofMatProducts
      .filter((d) => d.Guid == g && d.blendProduct)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);
    let stock = kikPStock.find((s) => {
      return s.ProductGuid == g;
    });

    // let nextDays = Math.floor(days * (pp.AvailableQty / invQty));

    return {
      ...pp,
      blendProduct: !!ppblend,
      TotalInvoiceQuantity: invQty,
      TotalInvoiceQuantityBlend: invQtyBlend,
      // nextDays: nextDays || 0,
      AllocatedQty: stock?.AllocatedQty || 0,
      QtyOnHand: stock?.QtyOnHand || 0,
      AvailableQty: stock?.AvailableQty || 0,
      OnPurchase: stock?.OnPurchase || 0,
      ProductGroup_edited: tableData[pp.ProductCode],
    };
  });

  // writeJsonFile("cron/g", kikSales);
  // writeJsonFile("cron/gbill", billofMatProducts);
  // writeCSVFile(`billofMaterial_${date.from}-${date.to}`, finalData);
  console.log("Success");

  return finalData;
}
async function getBillOfMaterialStockNeedsInvoice(from, to) {
  let kikProducts = readJsonFile("kik_all_products"); //require("../download-files/kik_all_products.json");
  let kikPStock = readJsonFile("kik_stock_all_products"); //require("../download-files/cron/kikps.json");
  let kikBillOfMat = readJsonFile("kik_billofmat_all_products"); //require("../download-files/cron/kik_billofMat.json");
  let kikSales = readJsonFile("teelixir_final_sales_invoices");
  let query = getMySqlQuery();
  let results = await query("SELECT * FROM teelixir_stock_on_hand");
  let tableData = results.reduce((d, r) => {
    return { ...d, [r.product_code]: r.product_group };
  }, {});
  // let days = 30;
  let date = {
    from: from || moment().subtract(30, "day").format("YYYY-MM-DD"),
    to: to || moment().format("YYYY-MM-DD"),
  };

  let days = moment(date.to).diff(moment(date.from), "day");

  kikSales = kikSales.filter((d) => {
    let idate = parseKIKDate(d.InvoiceDate);
    let _from = moment(date.from).utc();
    let _to = moment(date.to).utc();
    let orderDate = moment(moment(idate).utc().format("YYYY-MM-DD")).utc();

    return orderDate.isSameOrAfter(_from) && orderDate.isSameOrBefore(_to); //.isBetween(from, to);
  });

  // kikProducts = kikProducts.filter(
  //   (r) => r.ProductGroup?.GroupName == "Raw Materials"
  // );
  // let GroupNames = Array.from(
  //   new Set(kikProducts.map((d) => d.ProductGroup?.GroupName))
  // );

  // kikProducts=kikBillOfMat.map(r=>{
  //   return r.Product
  // })

  console.log(days, kikProducts.length, kikSales.length);

  kikProducts = kikProducts.map((d) => {
    // kikSales
    let sales = kikSales
      .filter((inv) => {
        return inv.InvoiceLines.find((b) => b.Product.Guid == d.Guid);
      })
      .map((w) => {
        let p = w.InvoiceLines.filter((b) => b.Product.Guid == d.Guid);
        let qty = p.reduce((s, a) => {
          return s + a.InvoiceQuantity || 0;
        }, 0);
        return {
          InvoiceNumber: w.InvoiceNumber,
          InvoiceDate: parseKIKDate(w.InvoiceDate),
          InvoiceQuantity: qty,
        };
      });

    let TotalInvoiceQuantity = sales.reduce((s, r) => {
      return s + r.InvoiceQuantity;
    }, 0);

    let stock = kikPStock.find((s) => {
      return s.ProductGuid == d.Guid;
    });

    // let BillOfMaterials = kikBillOfMat
    //   .filter((r) => {
    //     return r.BillOfMaterialsLines.find((b) => b.Product.Guid == d.Guid);
    //   })
    //   .map((b) => {
    //     return {
    //       BillNumber: b.BillNumber,

    //       ProductCode: b.Product.ProductCode,
    //       ProductDescription: b.Product.ProductDescription,
    //       UnitOfMeasure: b.Product.UnitOfMeasure?.Name || "",
    //       ProductGroup: b.Product.ProductGroup?.GroupName,
    //       Guid: b.Product.Guid,

    //       BillOfMaterialsLines: b.BillOfMaterialsLines.map((a) => {
    //         let stock1 = kikPStock.find((s) => {
    //           return s.ProductGuid == a.Product.Guid;
    //         });
    //         let AvailableQty1 = stock1?.AvailableQty || 0;
    //         let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
    //         // let nextDays1 = Math.floor(
    //         //   days * (AvailableQty1 / TotalInvoiceQuantity1)
    //         // );

    //         if (a.Product.Guid == d.Guid) {
    //           return null;
    //         }

    //         return {
    //           ProductCode: a.Product.ProductCode,
    //           ProductDescription: a.Product.ProductDescription,
    //           UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
    //           ProductGroup: a.Product.ProductGroup?.GroupName,
    //           Guid: a.Product.Guid,
    //           Quantity: a.Quantity,
    //           AllocatedQty: stock1?.AllocatedQty || 0,
    //           QtyOnHand: stock1?.QtyOnHand || 0,
    //           AvailableQty: AvailableQty1,
    //           TotalInvoiceQuantity: TotalInvoiceQuantity1,
    //           // nextDays: nextDays1,
    //         };
    //       }).filter(Boolean),
    //     };
    //   });

    let BillOfMaterials = [];

    let blendProduct = d.ProductCode.includes("-BLEND-");
    let assembleProduct = kikBillOfMat.find((r) => r.Product?.Guid == d.Guid);

    if (assembleProduct) {
      assembleProduct = {
        BillNumber: assembleProduct.BillNumber,

        ProductCode: assembleProduct.Product.ProductCode,
        ProductDescription: assembleProduct.Product.ProductDescription,
        UnitOfMeasure: assembleProduct.Product.UnitOfMeasure?.Name || "",
        ProductGroup: assembleProduct.Product.ProductGroup?.GroupName,
        Guid: assembleProduct.Product.Guid,

        BillOfMaterialsLines: assembleProduct.BillOfMaterialsLines.map((a) => {
          let stock1 = kikPStock.find((s) => {
            return s.ProductGuid == a.Product.Guid;
          });
          let AvailableQty1 = stock1?.AvailableQty || 0;
          let TotalInvoiceQuantity1 = TotalInvoiceQuantity * a.Quantity;
          // let nextDays1 = Math.floor(
          //   days * (AvailableQty1 / TotalInvoiceQuantity1)
          // );
          let blendProduct1 = a.Product.ProductCode.includes("-BLEND-");
          if (blendProduct) {
            blendProduct1 = true;
          }
          // blendProduct1=blendProduct
          return {
            ProductCode: a.Product.ProductCode,
            ProductDescription: a.Product.ProductDescription,
            UnitOfMeasure: a.Product.UnitOfMeasure?.Name || "",
            ProductGroup: a.Product.ProductGroup?.GroupName,
            Guid: a.Product.Guid,
            Quantity: a.Quantity,
            AllocatedQty: stock1?.AllocatedQty || 0,
            QtyOnHand: stock1?.QtyOnHand || 0,
            AvailableQty: AvailableQty1,
            TotalInvoiceQuantity: TotalInvoiceQuantity1,
            blendProduct: blendProduct1,
            // nextDays: nextDays1,
          };
        }),
      };
    }

    let AvailableQty = stock?.AvailableQty || 0;
    // let nextDays = Math.floor(days * (AvailableQty / TotalInvoiceQuantity));

    return {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure?.Name || "",
      ProductGroup: d.ProductGroup?.GroupName,
      Guid: d.Guid,
      AllocatedQty: stock?.AllocatedQty || 0,
      QtyOnHand: stock?.QtyOnHand || 0,
      AvailableQty: AvailableQty,
      TotalInvoiceQuantity,
      // nextDays,
      assembleProduct,
      blendProduct,
      // sales,
      BillOfMaterials,
    };
  });
  //.filter((r) => r.BillOfMaterials.length && r.TotalInvoiceQuantity);
  //.filter((r) => r.sales.length);
  // return kikProducts;
  console.log("after", kikProducts.length);
  let billofMatProducts = kikProducts.reduce((arr, d) => {
    let ps1 = d?.assembleProduct?.BillOfMaterialsLines || [];

    let ps = d.BillOfMaterials.reduce((arr1, d1) => {
      let BillOfMaterialsLines = d1.BillOfMaterialsLines;

      return [...arr1, ...BillOfMaterialsLines];
    }, []);
    let prod = {
      ProductCode: d.ProductCode,
      ProductDescription: d.ProductDescription,
      UnitOfMeasure: d.UnitOfMeasure,
      ProductGroup: d.ProductGroup,
      Guid: d.Guid,
      AllocatedQty: d?.AllocatedQty || 0,
      QtyOnHand: d?.QtyOnHand || 0,
      AvailableQty: d.AvailableQty || 0,
      TotalInvoiceQuantity: d.TotalInvoiceQuantity,
      parent: true,
      blendProduct: d?.blendProduct,
    };
    return [...arr, prod, ...ps, ...ps1];
  }, []);
  // return billofMatProducts
  let uniqueP = Array.from(new Set(billofMatProducts.map((r) => r.Guid)));

  let finalData = uniqueP.map((g) => {
    let pp = billofMatProducts.find((d) => d.Guid == g);
    let ppblend = billofMatProducts.find((d) => d.Guid == g && d.blendProduct);
    let invQty = billofMatProducts
      .filter((d) => d.Guid == g && !d.blendProduct)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);

    let invQtyBlend = billofMatProducts
      .filter((d) => d.Guid == g && d.blendProduct)
      .reduce((s, r) => {
        return s + r.TotalInvoiceQuantity;
      }, 0);

    let nextDays = Math.floor(days * (pp.AvailableQty / invQty));

    return {
      ...pp,
      blendProduct: !!ppblend,
      TotalInvoiceQuantity: invQty,
      TotalInvoiceQuantityBlend: invQtyBlend,
      nextDays: nextDays || 0,
      ProductGroup_edited: tableData[pp.ProductCode],
    };
  });

  // writeJsonFile("cron/g", kikProducts);
  // writeJsonFile("cron/gbill", billofMatProducts);
  // writeCSVFile(`billofMaterial_${date.from}-${date.to}`, finalData);
  console.log("Success");

  return finalData;
}

exports.getBillOfMaterialStockNeeds = getBillOfMaterialStockNeeds;

exports.shopifyTeelixirPhoneUpdate = async () => {
  let query = getMySqlQuery();
  let results = await query(
    `SELECT id,phone,updated_phone FROM shopify_orders where phone!='' and updated_phone is null`
  );
  results = results.filter((p) => {
    let phone = p.phone;
    return (
      phone.startsWith("4") ||
      phone.startsWith("04") ||
      phone.startsWith("61") ||
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
    await query("update shopify_orders set updated_phone=? WHERE id = ?", [
      element.updated_phone,
      element.id,
    ]);
    console.log(`updated:- ${++count}/${total}`);
  }

  writeJsonFile("phones", results);
  console.log(results.length);
  return results;
};

exports.shopifyCustomerPhoneVerifyUpdate = async () => {
  let query = getMySqlQuery();
  let results = await query(
    `SELECT updated_phone FROM shopify_orders where updated_phone is not null and phone_valid is null GROUP by updated_phone;`
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
      `UPDATE  shopify_orders set phone_valid=?,numverify_json=?  where updated_phone =?`,
      [phone_valid, JSON.stringify(data), row.updated_phone]
    );
    console.log("progress--", ++i, "/", total);
    await sleep(800);
  }

  // writeJsonFile("phones", results);
  console.log("Success");
  return results;
};
