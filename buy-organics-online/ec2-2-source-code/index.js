require("dotenv").config();
const { connectMySql, getMySqlQuery } = require("./config/mysql");
const {
  getBigComProducts,
  updateBigComProducts,
  updateBCInvTracProducts,
  getBigComProduct,
  updateBCPrices,
  fetchScoreBCProducts,
  fetchScoreBCCatProducts,
  getBCOrders,
  BCPhoneUpdate,
  BCCustomerPhoneVerifyUpdate,
} = require("./heplers/big-commerce.helper");
const { getUHPProducts } = require("./heplers/uhp.helper");
const {
  getOborneProducts,
  getOborneProductsFTP,
  getOborneStock,
} = require("./heplers/oborne.helper");
const { getKadacProducts } = require("./heplers/kadac.helper");
const { getGlobalNatureProducts } = require("./heplers/globalnature.helper");
const {
  getKIKProducts,
  getKIKStocks,
  getKIKSalesOrders,
  getKIKCustomersOrders,
  generateKIKSalesUnitReport,
  getKIKSalesInvoices,
  generateKIKInvoiceUnitReport,
  getAllShopifyOrders,

  shopifyTeelixirPhoneUpdate,
  shopifyCustomerPhoneVerifyUpdate,
} = require("./heplers/kik.helpers");
const { initExpressApp } = require("./config/express.app");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
let mc = connectMySql();
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { isDev } = require("./config/app");
const moment = require("moment");
const { trimDirFiles } = require("./util/app.util");

const { getKlaviyoProfile } = require("./heplers/klaviyo.helper");

//////////////////////

// getBigComProduct(35873)
//2131
// updateBigComProducts([{"id":35873,"categories":[  979, 299,2132 ]}]);
//  updateBCInvTracProducts();
/////////////////////////

async function main() {
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching BC----");
  console.time("bc");
  await getBigComProducts();
  console.timeEnd("bc");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE BC---");
  console.log(
    "================================================================================================="
  );
  //  return;
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching UHP----");
  console.time("uhp");
  await getUHPProducts();
  console.timeEnd("uhp");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE UHP---");
  console.log(
    "================================================================================================="
  );
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching OBORNE----");
  console.time("ob");
  await getOborneProductsFTP();
  console.timeEnd("ob");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE OBORNE---");
  console.log(
    "================================================================================================="
  );
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching KADAC----");
  console.time("kad");
  let res = await getKadacProducts();
  console.timeEnd("kad");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE KADAC---");
  // console.log(
  //   "================================================================================================="
  // );
  // console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching GlobalNature----");
  // console.time("gbn");
  // await getGlobalNatureProducts();
  // console.timeEnd("gbn");
  // console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE GlobalNature---");

  console.log(
    "================================================================================================="
  );
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching KIK----");
  console.time("kik");
  await getKIKProducts();
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching KIK Stock----");
  await getKIKStocks();

  console.timeEnd("kik");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE KIK---");

  //////////////

  let callApi = !isDev;
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>UPDATING INVENTORY LEVEL....---");
  console.time("update_inv_lvl");
  await updateBCInvTracProducts(callApi, { kadac: res, gbn: false });
  console.timeEnd("update_inv_lvl");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>UPDATED  INVENTORY LEVEL---");

  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>UPDATING PRICE ....---");
  console.time("update_price");
  await updateBCPrices(callApi);
  console.timeEnd("update_price");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>UPDATED PRICE---");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>END---");
  trimDirFiles(70);
}

async function GlobalNatureStockUpdateCron() {
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching BC----");
  console.time("bc");
  await getBigComProducts();
  console.timeEnd("bc");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE BC---");

  console.log(
    "================================================================================================="
  );
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>fetching GlobalNature----");
  console.time("gbn");
  await getGlobalNatureProducts();
  console.timeEnd("gbn");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>DONE GlobalNature---");

  console.log(
    "================================================================================================="
  );

  //////////////

  let callApi = !isDev;
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>UPDATING INVENTORY LEVEL....---");
  // return
  console.time("update_inv_lvl");
  await updateBCInvTracProducts(callApi, {
    kadac: false,
    ob: false,
    gbn: true,
    uhp: false,
    kik: false,
  });
  console.timeEnd("update_inv_lvl");
  console.log("---->>>>>>>>>>>>>>>>>>>>>>>>>>>UPDATED  INVENTORY LEVEL---");
}



setTimeout(async () => {
  console.log("----------------------------------");
  // main();
  // GlobalNatureStockUpdateCron()
    // await updateBCInvTracProducts(true, { kadac: true, gbn: false });
  // getUHPProducts()
// fetchScoreBCCatProducts()
// fetchScoreBCProducts()
// updateBCInvTracProducts(false)
// getOborneProductsFTP()
// getKIKSalesInvoices(true)
// const invData=require('../download-files/kik_final_sales_invoices.json')
// generateKIKInvoiceUnitReport(invData, true);
// getOborneStock()
  // GlobalNatureStockUpdateCron()
  // getGlobalNatureProducts();
  // getKlaviyoProfile();
  // shopifyCustomerPhoneUpdate()
  // updateBCPrices(false)
  // getBCOrders()
  // shopifyTeelixirPhoneUpdate();
  //

  //////
  // getAllShopifyOrders();
  // shopifyTeelixirPhoneUpdate(); 
  //  shopifyCustomerPhoneVerifyUpdate()

  /////
  // getBCOrders();
  // BCPhoneUpdate()
  // BCCustomerPhoneVerifyUpdate()
}, 1000);

initExpressApp();
async function generateKIKSalesReport(teelixir = true) {
  let finalData = await getKIKSalesInvoices(teelixir);

  generateKIKInvoiceUnitReport(finalData, teelixir);
  /////////////
  // let finalData = await getKIKSalesOrders(teelixir);

  // generateKIKSalesUnitReport(finalData, teelixir);
}
// generateKIKSalesReport(true);

console.log(
  "isDev",
  isDev,
  moment().format("YYYY-DD-MM hh:mm A"),
  new Date(),
  new Date().toLocaleString()
);

// let freq11 = "45 0 * * *";
// // freq='0 */8 * * *'

// console.log("cron validate freq11", cron.validate(freq11));

// cron.schedule(freq11, () => {
//   console.log(
//     `<<>><<>><<<>><<>><<>><<>><<>><<>>GlobalNatureStockUpdateCron cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
//   );
//   if (!isDev) {
//     GlobalNatureStockUpdateCron();
//   }
// });

// let freq12 = "45 8 * * *";
// // freq='0 */8 * * *'

// console.log("cron validate freq12", cron.validate(freq12));

// cron.schedule(freq12, () => {
//   console.log(
//     `<<>><<>><<<>><<>><<>><<>><<>><<>>GlobalNatureStockUpdateCron cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
//   );
//   if (!isDev) {
//     GlobalNatureStockUpdateCron();
//   }
// });

let freq13 = "45 */2 * * *";
// freq='0 */8 * * *'

console.log("cron validate freq13", cron.validate(freq13));

cron.schedule(freq13, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>GlobalNatureStockUpdateCron cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    GlobalNatureStockUpdateCron();
  }
});

let freq = "0 */2 * * *";
// freq='0 */8 * * *'
console.log("cron validate", cron.validate(freq));
cron.schedule(freq, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    main();
  }
  // this.updateBCInvTracProducts();
});

let freq112 = "0 7 * * *"; //At 07:00 AM

console.log("cron validate freq112", cron.validate(freq112));
cron.schedule(freq112, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>getBCOrders cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    getBCOrders();
  }
});

let freq1121 = "0 5 * * *"; //At 07:00 AM

console.log("cron validate freq1121", cron.validate(freq1121));
cron.schedule(freq1121, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>getAllShopifyOrders cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    getAllShopifyOrders();
  }
});

let freq1 = "0 6 * * *"; //At 06:00 AM

console.log("cron validate 1", cron.validate(freq1));
cron.schedule(freq1, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>teelixir sale report cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    generateKIKSalesReport(true);
  }
});

let freq2 = "15 6 * * *"; //At 06:15 AM
console.log("cron validate 1", cron.validate(freq2));
cron.schedule(freq2, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>sale report cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    generateKIKSalesReport(false);
  }
});

let freq3 = "0 */8 * * *"; //At 6:15 am
console.log("cron validate freq3", cron.validate(freq3));
cron.schedule(freq2, () => {
  console.log(
    `<<>><<>><<<>><<>><<>><<>><<>><<>>sale report cron running ...${new Date().toString()}<<>><<>><<<>><<>><<>><<>><<>><<>>`
  );
  if (!isDev) {
    getOborneStock();
  }
});
