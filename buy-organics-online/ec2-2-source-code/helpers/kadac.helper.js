const { getMySqlQuery } = require("../config/mysql");

const fs = require("fs");
const excel2csv = require("excel2csv");
const Excel = require("exceljs");

const lodash = require("lodash");
const cliProgress = require("cli-progress");

const { default: axios } = require("axios");

const path = require("path");
const { writeJsonFileCron } = require("../util/app.util");
function truncateTable() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("TRUNCATE kadac_products");

    r(true);
  });
}
function insertProduct(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("SELECT * FROM kadac_products WHERE sku = ?", [
      data["sku"],
    ]);

    let isExist = !!results.length;
    let fields = `sku=?,brand=?,description=?,size=?,gst=?,wholesale=?,rrp=?,percarton=?,cartononly=?,barcode=?,stockstatus=?,imageurl=?`;
    let sql = isExist
      ? `UPDATE kadac_products SET ${fields} where sku=?`
      : `INSERT INTO kadac_products SET ${fields}`;

    let result1 = await query(sql, [
      data["sku"],
      data["brand"],
      data["description"],
      data["size"],
      data["gst"],
      data["wholesale"],
      data["rrp"],
      data["percarton"],
      data["cartononly"],
      data["barcode"],
      data["stockstatus"],
      data["imageurl"],
      ...(isExist ? [data["sku"].toString()] : []),
    ]).catch((err) => {
      console.log(data["sku"], isExist, err.sqlMessage);
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

exports.getKadacProducts = () => {
  return new Promise(async (res) => {
    await truncateTable();
    const bar1 = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );

    let url =
      "https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv";
     
    const resp = await axios
      .get(url, {
        responseType: "stream",
      })
      .catch((err) => {
        console.log("[getKadacProducts]", err);
      });
    if (!resp) {
      res(false);
      return;
    }

    let { data, headers } = resp;

    const totalLength = headers["content-length"];
    console.log("totalLength", totalLength);
    console.log("file downloading...");
    bar1.start(parseInt(totalLength), 0);
    let urlData = path.parse(url);
    let filename = `kadac_${urlData.name}_${new Date().getTime()}`;
    // filename = `uhp_prods_1679411095707`;
    let filePath = path.resolve("download-files", `${filename}.csv`);
    let jsonFilePath = path.resolve("download-files", `${filename}.json`);
    let csvFilePath = path.resolve("download-files", `${filename}.csv`);
    const writer = fs.createWriteStream(filePath);

    writer.on("close", () => {
      bar1.stop();

      setTimeout(async () => {
        // let filePath =
        //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/products_1679385212856.csv";
        // filePath =
        //   "/Users/aakashmourya/infugin_work/findyouridealcustomers/node-server/download-files/uhp_prods_1679411095707.csv";
        // await excel2csv.convert(filePath, {
        //   csvPath: csvFilePath,
        //   writeCsv: true,
        // });
        console.log("file downloaded.", filePath);
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

        writeJsonFileCron('kad',data)

        ////json file ////////
        // fs.writeFileSync(jsonFilePath, JSON.stringify(data));
        //////////
     
        let dataChunks = lodash.chunk(data, 50);
        let totalChunks = dataChunks.length;
        bar1.start(totalChunks, 0);
        for (let i = 0; i < totalChunks; i++) {
          let dataRow = dataChunks[i];

          await Promise.allSettled(
            dataRow.map((row) => {
              return insertProduct(row);
            })
          );

          bar1.increment();
        }
        bar1.stop();
        fs.existsSync(filePath) && fs.unlinkSync(filePath);
        fs.existsSync(csvFilePath) && fs.unlinkSync(csvFilePath);
        fs.existsSync(jsonFilePath) && fs.unlinkSync(jsonFilePath);
        console.log("Success");
        res(true);
      }, 600);
    });

    data.on("data", (chunk) => {
      bar1.increment(chunk.length);
    });
    data.pipe(writer);
  });
};

// SELECT sku, COUNT(sku) FROM `kadac_products` GROUP by sku ORDER BY `COUNT(sku)` DESC;
