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
    let results = await query("TRUNCATE uhp_products");

    r(true);
  });
}
function insert_UHP_Product(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("SELECT * FROM uhp_products WHERE sku = ?", [
      data["Stockcode"],
    ]);

    let isExist = !!results.length;
    let fields = `sku=?,brand=?,description=?,size=?,ws_ex_gst=?,gst=?,rrp=?,moq=?,unit_ws_ex_gst=?,apn_barcode=?,categories=?,is_active=?,in_stock=?,new=?,on_deal=?,clearance=?,certified_organic=?,organic=?,glutenFree=?,vegetarian=?,vegan=?,dairy_free=?,ingredients=?,image1=?,image2=?,u_width=?,u_height=?,u_length=?,u_weight=?,ctn_qty=?,ctn_barcode=?,ctn_width=?,ctn_height=?,ctn_length=?,ctn_weight=?`;
    let sql = isExist
      ? `UPDATE uhp_products SET ${fields} where sku=?`
      : `INSERT INTO uhp_products SET ${fields}`;

    let result1 = await query(sql, [
      data["Stockcode"],
      data["Brand"],
      data["Description"],
      data["Size"],
      data["W/S ex GST"],
      data["GST"],
      data["RRP"],
      data["MOQ"],
      data["Unit W/S ex GST"],
      data["APN Barcode"],
      data["Categories"],
      data["IsActive"],
      data["InStock"],
      data["New"],
      data["OnDeal"],
      data["Clearance"],
      data["CertifiedOrganic"],
      data["Organic"],
      data["GlutenFree"],
      data["Vegetarian"],
      data["Vegan"],
      data["DairyFree"],
      data["Ingredients"],
      data["Image1"],
      data["Image2"],
      data["U.Width (mm)"],
      data["U.Height (mm)"],
      data["U.Length (mm)"],
      data["U.Weight (kg)"],
      data["Ctn Qty"],
      data["Ctn Barcode"],
      data["Ctn.Width (mm)"],
      data["Ctn.Height (mm)"],
      data["Ctn.Length (mm)"],
      data["Ctn.Weight (kg)"],
      ...(isExist ? [data["Stockcode"]] : []),
    ]).catch((err) => {
      console.log(data["Stockcode"], isExist, err.sqlMessage);
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

exports.getUHPProducts = () => {
  return new Promise(async (res) => {
    await truncateTable();

    const bar1 = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );

    let url = "https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx";

    const resp = await axios
      .get(url, {
        responseType: "stream",
      })
      .catch((err) => {
        console.log("[getUHPProducts]", err);
      });
    if (!res) {
      res(true);
      return;
    }
    const { data, headers } = resp;
    const totalLength = headers["content-length"];
    console.log("totalLength", totalLength);
    console.log("file downloading...");
    bar1.start(parseInt(totalLength), 0);
    let urlData = path.parse(url);
    let filename = `${urlData.name}_${new Date().getTime()}`;
    // filename = `uhp_prods_1679411095707`;
    let filePath = path.resolve("download-files", `${filename}.xlsx`);
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
        await excel2csv.convert(filePath, {
          csvPath: csvFilePath,
          writeCsv: true,
        });
        console.log("file downloaded.", filePath);
        const workbook = new Excel.Workbook();
        const reader = fs.createReadStream(csvFilePath);
        console.log("file reading...", csvFilePath);
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

        writeJsonFileCron('uhp',data);

        let dataChunks = lodash.chunk(data, 50);
        let totalChunks = dataChunks.length;
        bar1.start(totalChunks, 0);
        for (let i = 0; i < totalChunks; i++) {
          let dataRow = dataChunks[i];

          await Promise.allSettled(
            dataRow.map((row) => {
              return insert_UHP_Product(row);
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

// SELECT sku, COUNT(sku) FROM `uhp_products` GROUP by sku ORDER BY `COUNT(sku)` DESC;
