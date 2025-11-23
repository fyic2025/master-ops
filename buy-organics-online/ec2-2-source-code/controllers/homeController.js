const { getMySqlQuery } = require("../config/mysql");
const { render } = require("../util/view.util");

let query = getMySqlQuery();
exports.loginView = (req, res, next) => {
  res.render("login", { data: "", title: "admin" });
};

exports.loginPost = async (req, res, next) => {
  let adata = req.body.adata;
  let udata = JSON.parse(adata);
  console.log(udata);

  let results = await query("SELECT * FROM admin WHERE email = ? AND uid = ?", [
    udata.email,
    udata.uid,
  ]);

  if (results.length > 0) {
    if (!results[0].active) {
      req.flash(
        "error",
        "Your account needs to be enabled. Please contact your administrator."
      );
      res.redirect("/");
      return;
    }
    await query(
      "UPDATE  admin SET name=?,email=?,profile_pic=?,uid=?,auth_data=? where uid=?",
      [
        udata.displayName,
        udata.email,
        udata.photoURL,
        udata.uid,
        adata,
        udata.uid,
      ]
    );
    req.session.admin = {
      ...results[0],
      name: udata.displayName,
      email: udata.email,
      profile_pic: udata.photoURL,
      uid: udata.uid,
      auth_data: adata,
    };
    req.session.adminid = results[0].id;
    res.redirect("/dashboard");
  } else {
    await query(
      "INSERT INTO admin SET name=?,email=?,profile_pic=?,active=?,uid=?,auth_data=?",
      [udata.displayName, udata.email, udata.photoURL, "0", udata.uid, adata]
    );

    req.flash(
      "error",
      "Your account needs to be enabled. Please contact your administrator."
    );
    res.redirect("/");
  }

  // var email = req.body.email;
  // var password = req.body.password;

  // let results = await query(
  //   "SELECT * FROM admin WHERE email = ? AND password = ?",
  //   [email, password]
  // );

  // if (results.length > 0) {
  //   req.session.admin = results[0];
  //   req.session.adminid = results[0].id;
  //   res.redirect("/dashboard");
  // } else {
  //   req.flash("error", "please use correct email and password");
  //   res.redirect("/");
  // }
};

exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return console.log(err);
    }
    res.redirect("/");
  });
};

exports.dashboardView = (req, res, next) => {
  render(req, res, "dashboard", {
    data: {},
    title: "Dashboard",
  });
};
exports.categoriesView = async (req, res, next) => {
  render(req, res, "categories", {
    title: "Big Commerce Categories",
  });
};

exports.blogsView = async (req, res, next) => {
  render(req, res, "blogs", {
    title: "Big Commerce Blogs",
  });
};
exports.bigCommerceView = async (req, res, next) => {
  render(req, res, "big-commerce", {
    title: "Big Commerce",
  });
};

exports.bigCommerceBulkUpdateView = async (req, res, next) => {
  render(req, res, "big-commerce-bulk-update", {
    title: "Big Commerce - Bulk Update",
  });
};

exports.uhpView = async (req, res, next) => {
  render(req, res, "uhp", {
    title: "UHP",
  });
};

exports.oborneView = async (req, res, next) => {
  render(req, res, "oborne", {
    title: "Oborne",
  });
};

exports.kadacView = async (req, res, next) => {
  render(req, res, "kadac", {
    title: "Kadac",
  });
};

exports.globalNatureView = async (req, res, next) => {
  render(req, res, "global-nature", {
    title: "Global Nature",
  });
};

exports.kikView = async (req, res, next) => {
  render(req, res, "kik", {
    title: "KIK",
  });
};

exports.cronsView = async (req, res, next) => {
  render(req, res, "crons", {
    title: "Cron",
  });
};

exports.viewCronView = async (req, res, next) => {
  let id = req.params.id;

  let r = await query(
    `Select * ,DATE_FORMAT(date_time, "%d-%b-%Y %h:%i %p") as date_time_formatted from crons where id=?`,
    [id]
  );

  if (!r.length) {
    res.redirect("/crons");
    return;
  }

  render(req, res, "view-cron", {
    title: "View Cron",
    data: r[0],
  });
};

exports.allProductsView = async (req, res, next) => {
  render(req, res, "all-products", {
    title: "All Products",
  });
};

exports.googleConsoleSearchView = (req, res, next) => {
  render(req, res, "google-console-search", {
    data: {},
    title: "Google Console Search",
  });
};
exports.notListedUHPView = (req, res, next) => {
  render(req, res, "not-listed-uhp", {
    data: { searchKey: "UHP" },
    title: "Not Listed Products - UHP ",
  });
};
exports.notListedKADView = (req, res, next) => {
  render(req, res, "not-listed-uhp", {
    data: { searchKey: "KAD" },
    title: "Not Listed Products - KAD kadac ",
  });
};

exports.notListedOBView = (req, res, next) => {
  render(req, res, "not-listed-uhp", {
    data: { searchKey: "OB" },
    title: "Not Listed Products - OB",
  });
};

exports.notListedGBNView = (req, res, next) => {
  render(req, res, "not-listed-uhp", {
    data: { searchKey: "GBN" },
    title: "Not Listed Products - GBN  ",
  });
};

exports.notListedKIKView = (req, res, next) => {
  render(req, res, "not-listed-uhp", {
    data: { searchKey: "KIK" },
    title: "Not Listed Products - KIK  ",
  });
};

exports.teelixirStockAnalysisView = async (req, res, next) => {
  render(req, res, "teelixir-stock-analysis", {
    title: "Teelixir Stock Analysis",
  });
};

exports.teelixirStockOnHandView = async (req, res, next) => {
  render(req, res, "teelixir-stock-on-hand", {
    title: "Teelixir - Stock On Hand",
  });
};

exports.teelixirBillOfMaterialsView = async (req, res, next) => {
  render(req, res, "teelixir-bill-of-materials", {
    title: "Teelixir - Bill of Materials",
  });
};

exports.teelixirStockNeedsView = async (req, res, next) => {
  render(req, res, "teelixir-stock-needs", {
    title: "Teelixir - Stock Needs",
  });
};

exports.vapiWebhookView = async (req, res, next) => {
  render(req, res, "vapi-webhook", {
    title: "VAPI Webhook",
  });
};

exports.ch2dataView = async (req, res, next) => {
  render(req, res, "ch2-data", {
    title: "CH2 Data",
  });
};

exports.productSalesVolumeView = async (req, res, next) => {
  render(req, res, "product-sales-volume", {
    title: "BOO",
  });
};

exports.customerBuyingHistoryView = async (req, res, next) => {
  render(req, res, "customer-buying-history", {
    title: "BOO",
  });
};

exports.shopifyTeelixirProductSalesVolumeView = async (req, res, next) => {
  render(req, res, "shopify-teelixir-product-sales-volume", {
    title: "Shopify Teelixir",
  });
};

exports.shopifyTeelixirCustomerBuyingHistoryView = async (req, res, next) => {
  render(req, res, "shopify-teelixir-customer-buying-history", {
    title: "Shopify Teelixir",
  });
};

exports.klaviyoProfilesView = async (req, res, next) => {
  render(req, res, "klaviyo-profiles", {
    title: "Klaviyo Contacts",
  });
};

exports.shopifyTeelixirKlaviyoProfilesView = async (req, res, next) => {
  render(req, res, "shopify-teelixir-klaviyo-profiles", {
    title: "Teelixir Contacts",
  });
};
