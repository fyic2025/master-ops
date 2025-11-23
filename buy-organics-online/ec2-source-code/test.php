<?php

set_time_limit(0);

use Illuminate\Database\Capsule\Manager as Capsule;

include 'BigCommerceController.php';

include 'Api_manager.php';

include 'SupplierFactory.php';

include 'OborneController.php';

require 'vendor/autoload.php';

require 'config/database.php';
$factory = new SupplierFactory();


$globalnature = $factory->getSupplier('GlobalNature');
// $globalnature->testText();
// print_r($globalnature);
// echo "pricessss";
$globalnature->set_feed_products();
$globalnature->test_prices();

/*
$oborne = $factory->getSupplier('Oborne');
$oborne->set_feed_products();
$oborne->do_bulk_update();*/
/*$uhp = $factory->getSupplier('Uhp');
$uhp->set_feed_products();
$uhp->do_bulk_update_price();*/
/*
// $kadac = $factory->getSupplier('Kadac');
$kadac->set_feed_products();
$kadac->set_changed_and_new_products();
// // var_dump($kadac->get_new_products());
$kadac->update();*/
return true;
/*$manager = new Api_manager();
$resp = $manager->upd_product_images($image_url, $product_id, $image_id);
echo json_encode($resp);*/
//$uhp = $factory->getSupplier('Uhp');
/* $uhp->set_feed_products();
  $uhp->do_bulk_update(); */




/* $globalnature = $factory->getSupplier('GlobalNature');
  $globalnature->set_feed_products();
  $globalnature->do_bulk_update(); */
/* $oborne = $factory->getSupplier('Oborne');
  //$oborne->todelnewob();
  $oborne->set_feed_products();
  $oborne->do_bulk_update(); */
//$oborne = $factory->getSupplier('Oborne');
/* $uhp = $factory->getSupplier('Uhp');
  $uhp->set_feed_products();
  $uhp->do_bulk_update(); */

//$headers = array(
//    'Content-Type: ' . 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
//);
//$ch = curl_init();
//curl_setopt($ch, CURLOPT_URL, "https://shop.uhp.com.au/");
//curl_setopt($ch, CURLOPT_VERBOSE, true);
//curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
//curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
//curl_setopt($ch, CURLOPT_HEADER, 1);
//curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
//$response = curl_exec($ch);
//curl_close($ch);
//preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $response, $matches);
//$cookies = array();
//foreach ($matches[1] as $item) {
//    parse_str($item, $cookie);
//    $cookies = array_merge($cookies, $cookie);
//}
//if (isset($cookies) && isset($cookies["uhp"])) {
//    $uhpvalini = $cookies["uhp"];
//} else
//    return false;
//$cookies = $_COOKIE;
//$cookarr = array();
//$cookf = "Cookie: ";
//foreach ($cookies as $key => $item) {
//    $cookarr[] = $key . "=" . $item;
//}
//$cookarr[] = "uhp=" . $uhpvalini;
//$cookf .= implode("; ", $cookarr);
//
//$dom = new DOMDocument();
//@$dom->loadHTMLFile('https://shop.uhp.com.au/login'); //$result = $dom->loadHTML($result);
//$data = $dom->getElementById("login");
//$callp = $data->getAttribute("action");
//
//$data_string = array("customers_email_address" => "sales@buyorganicsonline.com.au", "customers_password" => "10386",
//    "labels" => array("customers_email_address" => "Email", "customers_password" => "Password"),
//    "labels" => array("login" => ""),
//    "groups" => array("" => 11), "callback" => "login.php");
//$rq = http_build_query($data_string);
//$headersr2 = array(
//    'Content-Type: ' . 'application/x-www-form-urlencoded',
//    $cookf
//);
//
//sleep(1);
//
//$api_url = "https://shop.uhp.com.au/" . $callp;
//$ch = curl_init();
//curl_setopt($ch, CURLOPT_URL, $api_url);
//curl_setopt($ch, CURLOPT_HEADER, 1);
//curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
//curl_setopt($ch, CURLOPT_POSTFIELDS, $rq);
//curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
//curl_setopt($ch, CURLOPT_HTTPHEADER, $headersr2);
//curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
//curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
//curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
//$response = curl_exec($ch);
//curl_close($ch);
//
//sleep(2);
//$headersr3 = array(
//    'Content-Type: ' . 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
//    $cookf
//);
//echo $cookf;
//
//$fileUrl = 'https://shop.uhp.com.au/uhp_products_export.php';
//$saveTo = '/var/www/clients/client0/web15/web/uhp_prods.csv';
//$fp = fopen($saveTo, 'w+');
//if ($fp === false) { echo "Could not open:";
//    throw new Exception('Could not open: ' . $saveTo);
//}
//$ch = curl_init($fileUrl);
//curl_setopt($ch, CURLOPT_FILE, $fp);
//curl_setopt($ch, CURLOPT_HTTPHEADER, $headersr3);
//curl_setopt($ch, CURLOPT_TIMEOUT, 20);
//curl_exec($ch);
//if (curl_errno($ch)) {
//    throw new Exception(curl_error($ch));
//}
//$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
//curl_close($ch);
//fclose($fp);
////rename('./uhp_prods.csv', '/var/www/clients/client0/web15/web/uhp_prods.csv');
//echo $statusCode;
//if ($statusCode == 200) {
//    
//    return true;
//} else {
//    return false;
//}
/* function get_sku_products() {
  $handle = fopen("KAD_prods_price.csv", "r");
  $s = array();
  $row = 1;
  if ($handle !== FALSE) {
  while (($val = fgetcsv($handle, 0, ",")) !== FALSE) {
  $num = count($val);
  //  $csvdata = array();

  for ($c = 0; $c < $num; $c++) {
  $s[] = $val[$c];
  }


  $row++;
  }
  fclose($handle);
  }
  return $s;

  }
  $arr = get_sku_products(); */


//$factory = new SupplierFactory();
//$globalnature = $factory->getSupplier('GlobalNature');
//       $globalnature->checkProdsSet();
//$globalnature = $factory->getSupplier('GlobalNature');
//$globalnature->set_feed_products();
//$globalnature->do_bulk_update();
//$globalnature->get_bulk_products();

/* $kadac = $factory->getSupplier('Kadac');
  $kadac->set_feed_products();
  $kadac->get_bulk_products();
 */
/* $kadac = $factory->getSupplier('Kadac');
  $kadac->set_feed_products();
  $kadac->set_changed_and_new_products();
  // // var_dump($kadac->get_new_products());
  $kadac->update1($arr);
 */
/*
  $oborne = $factory->getSupplier('Oborne');
  $oborne->set_feed_products();
  $oborne->get_bulk_products();
 */
// $uhp = $factory->getSupplier('Uhp');
/*  $uhp->set_feed_products();
  $uhp->get_bulk_products(); */
//$uhp->do_bulk_update();
//$uhp->set_changed_and_new_products();
//$oborne = $factory->getSupplier('Oborne');
//$oborne->set_feed_products();
//$oborne->get_bulk_products(); 


/* $factory = new SupplierFactory();
  $oborne = $factory->getSupplier('Uhp');
  $oborne->get_bulk_products(); */
//    $kadac   = $factory->getSupplier('Kadac');  //- check for products that need review
//    $kadac->set_feed_products();
//    $kadac->get_bulk_products();
// $dd =  $kadac->get_review_prods();
//echo json_encode($dd);



/* if ( ((strpos('KAD - 484129', 'KAD') !== FALSE && strpos('KAD - 484129', 'KAD')>=0 && strpos('KAD - 484129', 'KAD')<3) ||  
  (strpos('KAD - 484129', 'NEWKAD') !== FALSE && strpos('KAD - 484129', 'NEWKAD')>=0 && strpos('KAD - 484129', 'NEWKAD')<3))
  && !in_array(1344, array(32, 416,425,979))) {
  echo "yes";
  // fwrite($this->myFile2, $this->live_products[$sku]['sku'].PHP_EOL);
  // $manager->update_product(array("is_price_hidden" => false), $live_product['id']);
  } else echo "no";
 */
/* if(strpos('KAD - 484129', 'KAD')!==FALSE && strpos('KAD - YT71', 'KAD')>=0 && !in_array(1344, array(1219,1346))){
  echo "ok - " . strpos('KAD - YT71', 'KAD');
  } else {
  echo "not ok";
  } */

//______________

/*

  // // var_dump($uhp->get_changed_products());exit();
  $uhp->update();

  $kadac   = $factory->getSupplier('Kadac');
  $kadac->set_feed_products();
  $kadac->set_changed_and_new_products();
  // // var_dump($kadac->get_new_products());
  $kadac->update();
 */
/* $oborne   = $factory->getSupplier('Oborne');
  $oborne->set_feed_products();
  $oborne->set_changed_and_new_products();
  // var_dump($oborne->get_changed_products());
  $oborne->update(); */

/*     $uhp = $factory->getSupplier('Uhp');
  $uhp->set_feed_products();
  $uhp->set_changed_and_new_products(); */
/* $oborne   = $factory->getSupplier('Oborne');
  $oborne->set_feed_products();
  $oborne->do_bulk_update(); */
//$oborne->set_changed_and_new_products();
// $oborne->update();

/*  $kadac   = $factory->getSupplier('Kadac');
  $kadac->set_feed_products();
  $kadac->set_changed_and_new_products();
  $kadac->update(); */
// //_________________________________
// $uhp->test_active_prod();
// $uhp->test_live_csv_rrp($active_products);
// $uhp->print_feed();
// $uhp->zero_rrp_products();
// //____________________________________
// $x = new Api_manager();
// $x->set_brands(1);
// print_r($x->get_brands());
//De decomentat!!!__________________________________
// $x = new BigCommerceController();
// $x->main();




// //______________________________________________
// //_________PRICE CHANGING TEST ZONE_________
// $uhp   = $factory->getSupplier('Uhp');
// $uhp->test_products_feed();
// $kadac   = $factory->getSupplier('Kadac');
// $kadac->test_products_feed();
// $oborne   = $factory->getSupplier('Oborne');
// print_r($oborne->get_live_products());
// $oborne->test_products_feed();
?>
