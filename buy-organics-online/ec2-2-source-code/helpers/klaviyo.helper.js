const { default: axios } = require("axios");
const lodash = require("lodash");
const moment = require("moment-timezone");
const { getMySqlQuery } = require("../config/mysql");
const { writeJsonFile, readJsonFile } = require("../util/app.util");
exports.getKlaviyoProfile = async () => {
  async function callApi(page_cursor) {
    console.log(page_cursor);
    let url =
      page_cursor || `https://a.klaviyo.com/api/profiles?page[size]=100`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: "Klaviyo-API-Key pk_bdf656d626ab7c7556cf9da8063794722f",
        revision: "2024-10-15",
      },
    });

    let list = data?.data || [];
    let links = data?.links;

    let dataChunks = lodash.chunk(list, 50);
    let totalChunks = dataChunks.length;
    for (let i = 0; i < totalChunks; i++) {
      let dataRow = dataChunks[i];

      // dataRow.forEach((row) => {
      //   console.log(row.id);

      // })
      await Promise.allSettled(
        dataRow.map((row) => {
          return insertKlaviyoProfile(row);
        })
      );
    }

    writeJsonFile("klaviyo-last-page_cursor", page_cursor);

    if (links?.next) {
        await callApi(links?.next);
    }
  }

  let _page_cursor = readJsonFile("klaviyo-last-page_cursor") || "";

  await callApi(_page_cursor);
  console.log("[getKlaviyoProfile] Success");
};

function insertKlaviyoProfile(d) {
  return new Promise(async (r) => {
    let query = getMySqlQuery();
    let results = await query(
      "SELECT * FROM klaviyo_profiles WHERE profile_id = ?",
      [d.id]
    );
    let isExist = !!results.length;
    let fields = `profile_id=?,type=?,first_name=?,last_name=?,phone=?,email=?,	date_created=?,	date_modified	=?,metadata	=?`;
    let sql = isExist
      ? `UPDATE klaviyo_profiles SET ${fields} where profile_id=?`
      : `INSERT INTO klaviyo_profiles SET ${fields}`;

    let metadata = JSON.stringify({
      location: d.attributes?.location,
      properties: d.attributes?.properties,
    });

    let result1 = await query(sql, [
      d.id,
      d.type,
      d.attributes?.first_name || "",
      d.attributes?.last_name || "",
      d.attributes?.phone || "",
      d.attributes?.email || "",
      d.attributes?.created
        ? moment(d.attributes?.created).format("YYYY-MM-DD HH:mm:ss")
        : null,
      d.attributes?.updated
        ? moment(d.attributes?.updated).format("YYYY-MM-DD HH:mm:ss")
        : null,
      metadata,
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
