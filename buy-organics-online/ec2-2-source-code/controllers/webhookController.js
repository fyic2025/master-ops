const { getMySqlQuery } = require("../config/mysql");

exports.vapiWebhook = async (req, res, next) => {
  let query = getMySqlQuery();
  let sql = `INSERT INTO vapi_webhook SET data=?,header=?`;
  let result1 = await query(sql, [
    JSON.stringify(req.body),
    JSON.stringify(req.headers),
  ]).catch((err) => {
    console.log("vapiWebhook query Error- ", err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  res.json({
    result: "Your Balance is 220.",
    // body: req.body,
    // headers: req.headers,
  });
};

exports.getVapiWebhook = async (req, res, next) => {
  let query = getMySqlQuery();
  let sql = `Select * from vapi_webhook ORDER BY id DESC`;
  let result1 = await query(sql).catch((err) => {
    console.log("getVapiWebhook query Error- ", err.sqlMessage);
    // res.send(errorResponse(err.message));
  });
  res.json({
    status: true,
    data: result1,
  });
};
