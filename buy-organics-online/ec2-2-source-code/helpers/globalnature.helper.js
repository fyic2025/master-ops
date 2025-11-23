const { getMySqlQuery } = require("../config/mysql");

const fs = require("fs");
const excel2csv = require("excel2csv");
const Excel = require("exceljs");

const lodash = require("lodash");
const cliProgress = require("cli-progress");
const moment=require('moment-timezone')
const path = require("path");
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { writeJsonFileCron } = require("../util/app.util");
function truncateTable() {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query("TRUNCATE globalnature_products");

    r(true);
  });
}
function insertProduct(data) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM globalnature_products WHERE sku = ?",
      [data["Item Code"]]
    );
    // console.log(results);
    let isExist = !!results.length;
    let fields = `sku=?,brand=?,description=?,size=?,gst=?,wholesale=?,rrp=?,percarton=?,cartononly=?,barcode=?,stockstatus=?`;
    let sql = isExist
      ? `UPDATE globalnature_products SET ${fields} where sku=?`
      : `INSERT INTO globalnature_products SET ${fields}`;
    // if (!results.length) {

    let result1 = await query(sql, [
      data["Item Code"],
      data["brand"],
      data["description"],
      data["size"],
      data["GST"],
      data["wholesale"],
      data["rrp"],
      data["percarton"],
      data["cartononly"],
      data["barcode"],
      data["stockstatus"],
      ...(isExist ? [data["Item Code"].toString()] : []),
    ]).catch((err) => {
      //fs.appendFile('oborneLog.log',`${JSON.stringify({sku:data["Name"],isExist, err})}\n\n`,()=>{

      // })
      console.log(data["Item Code"], isExist, err.sqlMessage);
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
async function readFiles(files) {
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
    let csvFilePath = path.join(pathData.dir, pathData.name + ".csv");
    await excel2csv.convert(filePath, {
      csvPath: csvFilePath,
      writeCsv: true,
    });
    const workbook = new Excel.Workbook();
    const reader = fs.createReadStream(csvFilePath);
    console.log("file reading...", csvFilePath);
    let worksheet = await workbook.csv.read(reader);
    //console.log("file reading...", workbooka);

    // return;

    let header = [];
    let data = [];
    let totalRow = worksheet.rowCount;
    worksheet.eachRow(function (row, rowNumber) {
      // console.log(row.values);
      if (rowNumber == 1) {
        return;
      }
      if (totalRow - 2 < rowNumber) {
        return;
      }
      if (rowNumber == 2) {
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
  }
  writeJsonFileCron("gbn", finalData);
  console.log("Success");
}

exports.getGlobalNatureProducts = () => {
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
      let sinceData=moment().subtract(1,'d');
      console.log(' moment',sinceData.format('YYYY-MM-DD hh:mm A'))
      imap.once("ready", () => {
        imap.openBox("INBOX", false, () => {
          console.log("Reading emails...");
          imap.search(
            [
              "ALL",
              // ["FROM", "vanessa@oborne.com.au"],
              ["FROM", "yiyi.lu@globalbynature.com.au"],
              ["SINCE",sinceData.toDate()], //BEFORE|ON|SINCE|SENTBEFORE|SENTON|SENTSINCE
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
                    const {from, subject, textAsHtml, text,date} = parsed;
                    console.log("-----------",date);
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
                      // console.log(filename);
                      let filePath = path.resolve(
                        "download-files",
                        `${filename}.xlsx`
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
        await readFiles(files);
        res(true);
      });

      imap.connect();
    } catch (ex) {
      console.log("an error occurred",ex);
      res(false);
    }
  });
};

// SELECT sku, COUNT(sku) FROM `globalnature_products` GROUP by sku ORDER BY `COUNT(sku)` DESC
