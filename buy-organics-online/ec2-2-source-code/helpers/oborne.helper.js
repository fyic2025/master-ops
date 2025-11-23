const { getMySqlQuery } = require("../config/mysql");

const fs = require("fs");

const Excel = require("exceljs");
const moment = require("moment");
const lodash = require("lodash");
const cliProgress = require("cli-progress");
const excel2csv = require("excel2csv");
const path = require("path");
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { writeJsonFileCron } = require("../util/app.util");
function truncateTable() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("TRUNCATE oborne_products");

    r(true);
  });
}
function insert_Oborne_Product(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("SELECT * FROM oborne_products WHERE sku = ?", [
      data["Name"],
    ]);
    // console.log(results);
    let isExist = !!results.length;
    let fields = `sku=?,new_sku=?,name=?,brand=?,ws_ex_gst=?,rrp=?,gst_status=?,availability=?,stock_qty=?,barcode=?`;
    let sql = isExist
      ? `UPDATE oborne_products SET ${fields} where sku=?`
      : `INSERT INTO oborne_products SET ${fields}`;
    // if (!results.length) {

    let result1 = await query(sql, [
      data["Name"],
      data["Id"],
      data["Display Name"],
      data["Brand"],
      data["W/S ex gst"],
      data["RRP"],
      data["GST Status"],
      data["Availability"],
      data["StockQty"],
      data["Barcode"],
      ...(isExist ? [data["Name"]] : []),
    ]).catch((err) => {
      //fs.appendFile('oborneLog.log',`${JSON.stringify({sku:data["Name"],isExist, err})}\n\n`,()=>{

      // })
      console.log(data["Name"], isExist, err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }
    // console.log(q)
    // }
    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}
async function readOborneCSVFiles(files) {
  // const files = [
  //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/429 (vanessa@oborne.com.au)_searchresults.csv_1679500735992.csv",
  //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/429 (vanessa@oborne.com.au)_searchresults.csv_1679500736194.csv",
  //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/429 (vanessa@oborne.com.au)_searchresults.csv_1679500736336.csv",
  // ];
  const bar1 = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  let finalData = [];
  for (const filePath of files) {
    let pathData = path.parse(filePath);
    let jsonFilePath = path.join(pathData.dir, pathData.name + ".json");
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
    finalData = finalData.concat(data);
    ////json file ////////
    fs.writeFileSync(jsonFilePath, JSON.stringify(data));
    //////////

    let dataChunks = lodash.chunk(data, 50);
    let totalChunks = dataChunks.length;
    bar1.start(totalChunks, 0);
    for (let i = 0; i < totalChunks; i++) {
      let dataRow = dataChunks[i];

      await Promise.allSettled(
        dataRow.map((row) => {
          return insert_Oborne_Product(row);
        })
      );

      bar1.increment();
    }
    bar1.stop();
    // fs.existsSync(filePath) && fs.unlinkSync(filePath);
    // fs.existsSync(csvFilePath) && fs.unlinkSync(csvFilePath);
    // fs.existsSync(jsonFilePath) && fs.unlinkSync(jsonFilePath);
  }
  writeJsonFileCron("ob", finalData);
  console.log("Success");
}

exports.getOborneProducts = () => {
  return new Promise(async (res) => {
    await truncateTable();
    let files = [];
    try {
      const imapConfig = {
        user: "kylie@buyorganicsonline.com.au",
        password: "mLmZAWeeex2N%Q4m",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
      };
      const imap = new Imap(imapConfig);
      imap.once("ready", () => {
        imap.openBox("INBOX", false, () => {
          console.log("Reading emails...");
          imap.search(
            [
              "ALL",
              // ["FROM", "vanessa@oborne.com.au"],
              ["FROM", "vanessa.phillips@ch2.net.au"],
              // ["FROM",  "yiyi.lu@globalbynature.com.au"],
              ["SINCE", new Date()], //BEFORE|ON|SINCE|SENTBEFORE|SENTON|SENTSINCE
            ],
            (err, results) => {
              if (!results.length) {
                // console.log("err", err, results);
                imap.end();
                res(false);
                return;
              }

              const f = imap.fetch(results, { bodies: "" });

              f.on("message", (msg) => {
                // console.log(msg)
                msg.on("body", (stream) => {
                  simpleParser(stream, async (err, parsed) => {
                    // const {from, subject, textAsHtml, text} = parsed;
                    console.log("-----------");
                    // console.log(parsed.from.value[0].name);
                    // console.log(parsed.subject);
                    for (const attachment of parsed.attachments) {
                      // console.log(parsed.messageId);
                      // console.log(parsed.from);
                      // console.log(parsed.subject);
                      // console.log(parsed.attachments);

                      // let attachment = parsed.attachments[0];
                      let filename = `${parsed.from.value[0].name}_${
                        attachment.filename
                      }_${new Date().getTime()}`;
                      // filename = `uhp_prods_1679411095707`;
                      let filePath = path.resolve(
                        "download-files",
                        `${filename}.csv`
                      );
                      fs.writeFile(filePath, attachment.content, () => {
                        console.log("File Written...");
                        files.push(filePath);
                      });
                    }
                    // fs.writeFileSync(`${parsed.messageId.slice(0,10)}.csv`,parsed.attachments?.content)
                    // fs.writeFileSync(`${parsed.messageId.slice(0,10)}.json`,JSON.stringify({
                    //   messageId: parsed.messageId,
                    //   subject: parsed.subject,
                    // }))
                    /* Make API call to save the data
                   Save the retrieved data into a database.
                   E.t.c
                */
                  });
                });

                msg.once("attributes", (attrs) => {
                  const { uid } = attrs;
                  imap.addFlags(uid, ["\\Seen"], () => {
                    // Mark the email as read after reading it
                    console.log("Marked as read!");
                  });
                });
              });
              f.once("error", (ex) => {
                // console.log('error email---',ex);
                return Promise.reject(ex);
              });
              f.once("end", () => {
                console.log("Done fetching all messages!");
                imap.end();
              });
            }
          );
        });
      });

      imap.once("error", (err) => {
        console.log("error email---", err);
        res(false);
      });

      imap.once("end", async () => {
        console.log("Connection ended");

        console.log(files);
        // if (files.length) {
        //   await truncateTable();
        // }
        await readOborneCSVFiles(files);
        res(true);
      });

      imap.connect();
    } catch (ex) {
      console.log("an error occurred");
      res(false);
    }
  });
};

// SELECT sku, COUNT(sku) FROM `oborne_products` GROUP by sku ORDER BY `COUNT(sku)` DESC

/////barcode-upc paired products
// SELECT bc_products.product_id,oborne_products.sku as ob_sku,bc_products.sku as bc_sku,oborne_products.barcode,bc_products.upc,bc_products.name,oborne_products.availability,bc_products.inventory_level FROM bc_products left JOIN oborne_products on oborne_products.barcode =bc_products.upc and CONCAT_WS(" - ", "OB",oborne_products.sku) !=bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.upc!='N/A' and bc_products.sku LIKE 'OB - %';

/////barcode -gtin paired products
// SELECT bc_products.product_id,oborne_products.sku as ob_sku,bc_products.sku as bc_sku,oborne_products.barcode,bc_products.gtin,bc_products.upc,bc_products.name,oborne_products.availability,bc_products.inventory_level FROM bc_products left JOIN oborne_products on oborne_products.barcode =bc_products.gtin and CONCAT_WS(" - ", "OB",oborne_products.sku) !=bc_products.sku WHERE oborne_products.id IS NOT NULL and bc_products.gtin!='N/A' and bc_products.sku LIKE 'OB - %';

const { Client } = require("basic-ftp");
let csvToJson = require("convert-csv-to-json");
exports.getOborneProductsFTP = (insertStop = false) => {
  return new Promise(async (res) => {
    if (!insertStop) {
      await truncateTable();
    }

    let inventoryfilePath = path.resolve(
      "download-files",
      `ob-inventory-ftp.csv`
    );
    let productsfilePath = path.resolve(
      "download-files",
      `ob-products-ftp.csv`
    );

    console.log("Connecting Ftp...");
    const client = new Client();
    client.ftp.verbose = true;
    try {
      await client.access({
        host: "ftp3.ch2.net.au",
        user: "retail_310",
        password: "am2SH6wWevAY&#+Q",
        // secure: true,
      });
      // console.log(await client.list());
      // await client.uploadFrom("prod_retail_310/inventory.csv", "README_FTP.md");
      await client.downloadTo(
        inventoryfilePath,
        "prod_retail_310/inventory.csv"
      );
      await client.downloadTo(
        productsfilePath,
        "prod_retail_product/products.csv"
      );
    } catch (err) {
      console.log(err);
    }
    client.close();

    let products = csvToJson
      .fieldDelimiter("|")
      .getJsonFromCsv(productsfilePath);
    let inventory = csvToJson
      .fieldDelimiter("|")
      .getJsonFromCsv(inventoryfilePath);
    // console.log(inventory);

    // id: '2707472',
    // name: 'CARWARI MISO PASTE BROWN RICE RED 300G',
    // brandid: 'CARWAR',
    // brand: 'CARWARI INTERNATIONAL',
    // weight: '.0000',
    // upccode: '09368056969582',
    // baseprice: '11.41',
    // rrp: '16.55',
    // oborne_id: '15595',
    // oborne_sku: 'CWMPABRRO',
    // taxschedule: 'N',
    // obsolete: 'S'
    // id: '2630575', branch: '310', availablequantity: '24'
    let finalData = products.map((d) => {
      let stock = inventory.find((s) => s.id == d.id);
      let availablequantity = stock?.availablequantity || 0;
      return {
        Brand: d.brand || "",
        Name: d.oborne_sku || "",
        "Display Name": d.name || "",
        "W/S ex gst": d.baseprice || 0,
        RRP: d.rrp || 0,
        "GST Status": "GST applies",
        Availability: availablequantity > 0 ? "In Stock" : "Out of Stock", //"In Stock"
        Barcode: d.upccode || "",
        StockQty: availablequantity,
        Id: d.id || "",
      };
    });

    if (!insertStop) {
      // console.log(finalData);
      let dataChunks = lodash.chunk(finalData, 50);
      let totalChunks = dataChunks.length;
      const bar1 = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic
      );
      bar1.start(totalChunks, 0);
      for (let i = 0; i < totalChunks; i++) {
        let dataRow = dataChunks[i];

        await Promise.allSettled(
          dataRow.map((row) => {
            return insert_Oborne_Product(row);
          })
        );

        bar1.increment();
      }
      bar1.stop();
    }

    res(finalData);
  });
};

function insert_Oborne_Stocks(data, date_time) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();

    let fields = `new_sku=?,stock_qty=?,date_time=?`;
    let sql = `INSERT INTO oborne_stocks SET ${fields}`;
    // if (!results.length) {

    let result1 = await query(sql, [
      data["Id"],
      data["StockQty"],
      date_time,
    ]).catch((err) => {
      //fs.appendFile('oborneLog.log',`${JSON.stringify({sku:data["Name"],isExist, err})}\n\n`,()=>{

      // })
      console.log(data["Name"], err.sqlMessage);
      // res.send(errorResponse(err.message));
    });
    if (result1) {
      // console.log("products", index + 1, total_products);
    }
    // console.log(q)
    // }
    // setTimeout(() => {
    r(true);
    // }, 100);
  });
}

exports.getOborneStock = async () => {
  let finalData = await this.getOborneProductsFTP(true);
  let dataChunks = lodash.chunk(finalData, 50);
  let totalChunks = dataChunks.length;
  const bar1 = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  let today = moment().format("YYYY-MM-DD HH:mm:ss");
  bar1.start(totalChunks, 0);
  for (let i = 0; i < totalChunks; i++) {
    let dataRow = dataChunks[i];

    await Promise.allSettled(
      dataRow.map((row) => {
        // console.log(row);
        return insert_Oborne_Stocks(row, today);
      })
    );

    bar1.increment();
  }
  bar1.stop();
};
function calculateStockMetrics(stockQuantities) {
  // Initialize variables for the calculations
  let currentStock = stockQuantities[stockQuantities.length - 1]; // last quantity in the list
  let sellQty = 0;
  let purchaseQty = 0;

  // Loop through the list to calculate sell and purchase quantities
  for (let i = 1; i < stockQuantities.length; i++) {
    let difference = stockQuantities[i] - stockQuantities[i - 1];

    if (difference < 0) {
      sellQty += Math.abs(difference); // Add to sell quantity if stock decreases
    } else if (difference > 0) {
      purchaseQty += difference; // Add to purchase quantity if stock increases
    }
  }

  // Return the results as an object
  return {
    currentStock: currentStock,
    sellQty: sellQty,
    purchaseQty: purchaseQty,
  };
}
exports.getOborneStockData = async (params) => {
  let query = getMySqlQuery();
  // let results = await query("SELECT sku,oborne_products.new_sku,name,brand,oborne_stocks.date_time,oborne_stocks.stock_qty FROM `oborne_products` left join oborne_stocks on oborne_stocks.new_sku=oborne_products.new_sku WHERE date_time BETWEEN ? AND ?", [params.from,params.to]);

  let results = await query(
    "SELECT * FROM `oborne_stocks` WHERE SUBSTR(date_time,1,10) BETWEEN ? AND ?",
    [params.from, params.to]
  );
  let ObProducts = await query("SELECT * FROM `oborne_products`", [
    params.from,
    params.to,
  ]);

  let finalData = ObProducts.map((d) => {
    let stocks = results
      .filter((r) => r.new_sku == d.new_sku)
      .sort((a, b) => {
        return a.date_time - b.date_time;
      });

    let stockMatrix = calculateStockMetrics(stocks.map((a) => a.stock_qty));

    return {
      sku: d.sku,
      new_sku: d.new_sku,
      name: d.name,
      brand: d.brand,
      barcode: d.barcode,
      stock_qty: d.stock_qty,
      stockMatrix,
      // stocks,
    };
  });

  console.log(ObProducts.length, results.length);

  return finalData;
};

exports.getOborneStockDataBySkU = async (params) => {
  let query = getMySqlQuery();
  // let results = await query("SELECT sku,oborne_products.new_sku,name,brand,oborne_stocks.date_time,oborne_stocks.stock_qty FROM `oborne_products` left join oborne_stocks on oborne_stocks.new_sku=oborne_products.new_sku WHERE date_time BETWEEN ? AND ?", [params.from,params.to]);

  let results = await query(
    "SELECT * FROM `oborne_stocks` WHERE new_sku=? and SUBSTR(date_time,1,10) BETWEEN ? AND ? order by date_time desc",
    [params.new_sku, params.from, params.to]
  );

  return results;
};
