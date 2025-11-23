<?php

use Bigcommerce\Api\Client as Bigcommerce;

include_once 'Supplier.php';
include_once 'Api_manager.php';
require 'vendor/autoload.php';
require 'config/database.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

class Uhp implements Supplier {

    private $name;
    private $url;
    private $myFile;
    private $myFile2;
    private $products;
    private $changed_products = array();
    private $new_products;
    private $live_products;
    private $category = 1345; // alll need to have this category
    private $new_products_category = 1040;
    private $review_products_category = 1687;
    private $disabled_category = 1705;

    public function __construct($name, $url) {
        echo PHP_EOL . '<br><br>start UHP ' . date("Y-m-d h:i:sa") . '<br>';
        $this->name = $name;
        $this->url = $url;
        $this->dicontinuedprods = array();
        $status = $this->fetchUHPData();
        $this->myFile = fopen("update_activity.txt", "a") or die("Unable to open file!");
        //  $this->myFile2 = fopen("UHP_prods_notupdating.csv", "a") or die("Unable to open file!");

        $this->myFile3 = fopen("/var/www/bigcupdate.fyic.com.au/web/UHP_prods_prices.csv", "a") or die("Unable to open file!");
        $this->myFile4 = fopen("UHP_check_price.log", "a") or die("Unable to open file!");

        $this->myFileoutofstock = "/var/www/bigcupdate.fyic.com.au/web/prods_outofstock.csv";
        if (file_exists($this->myFileoutofstock) === true) {
            file_put_contents($this->myFileoutofstock, 'UHP ' . date("Y-m-d h:i:sa") . PHP_EOL, FILE_APPEND);
        } else {
            file_put_contents($this->myFileoutofstock, 'UHP ' . date("Y-m-d h:i:sa") . PHP_EOL);
            chmod($this->myFileoutofstock, 0644);
        }
        //  $this->myFile2 = fopen("UHP_prods_toreview.log", "a") or die("Unable to open file!");
    }

    private function fetchUHPData() {
        $url = "https://shop.uhp.com.au/login";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $res = curl_exec($ch);
        curl_close($ch);
        $dom = new \DOMDocument();
        @$dom->loadHTML($res);
        $htmldata = $dom->getElementById("login");
        $callp = $htmldata->getAttribute("action");
        /* $dom = new \DOMDocument();
          @$dom->loadHTMLFile('https://shop.uhp.com.au/login'); //$result = $dom->loadHTML($result);
          $htmldata = $dom->getElementById("login");
          $callp = $htmldata->getAttribute("action"); */


        $headers = array(
            'Content-Type: ' . 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        );
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://shop.uhp.com.au/");
        curl_setopt($ch, CURLOPT_VERBOSE, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_HEADER, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        curl_close($ch);
        preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $response, $matches);
        $cookies = array();
        foreach ($matches[1] as $item) {
            parse_str($item, $cookie);
            $cookies = array_merge($cookies, $cookie);
        }
        if (isset($cookies) && isset($cookies["uhp"])) {
            $uhpvalini = $cookies["uhp"];
        } else
            return false;
        $cookies = $_COOKIE;
        $cookarr = array();
        $cookf = "Cookie: ";
        foreach ($cookies as $key => $item) {
            $cookarr[] = $key . "=" . $item;
        }
        $cookarr[] = "uhp=" . $uhpvalini;
        $cookf .= implode("; ", $cookarr);

        $data_string = array("customers_email_address" => "sales@buyorganicsonline.com.au", "customers_password" => "10386",
            "labels" => array("customers_email_address" => "Email", "customers_password" => "Password"),
            "labels" => array("login" => ""),
            "groups" => array("" => 11), "callback" => "login.php");
        $rq = http_build_query($data_string);
        $headersr2 = array(
            'Content-Type: ' . 'application/x-www-form-urlencoded',
            $cookf
        );

        sleep(1);

        $api_url = "https://shop.uhp.com.au/" . $callp;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_HEADER, 1);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $rq);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headersr2);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        curl_close($ch);

        sleep(2);
        $headersr3 = array(
            'Content-Type: ' . 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            $cookf
        );
        $fileUrl = 'https://shop.uhp.com.au/uhp_products_export.php';
        $saveTo = $this->url; //'./uhp_prods.csv';
        $fp = fopen($saveTo, 'w+');
        if ($fp === false) {
            throw new Exception('Could not open: ' . $saveTo);
        }
        $ch = curl_init($fileUrl);
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headersr3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_exec($ch);
        if (curl_errno($ch)) {
            throw new Exception(curl_error($ch));
        }
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        if ($statusCode == 200) {
            return true;
        } else {
            return false;
        }
    }

    public function get_feed_products() {
        return $this->products;
    }

    public function get_changed_products() {
        return $this->changed_products;
    }

    public function get_new_products() {
        return $this->new_products;
    }

    public function get_live_products() {
        return $this->live_products;
    }

    // displays products that have the RPP = 0 in the CSV (these products sell in bulk so you should NOT update the price)
    public function zero_rrp_products() {
        /*    foreach($this->products as $product_id => $product) {
          if ($product[Deactivated] == NULL && ($product[RRP] < $product[Price])) {
          print_r($product[SKU]);
          echo '<br/>';
          }
          } */
    }

    // updates the prices of the products that are active, live and don't have the RPP=0
    private function update_price($manager) {
        fwrite($this->myFile3, date("Y-m-d h:i:sa") . PHP_EOL);

        foreach ($this->products as $product_id => $product) {
            if (isset($this->live_products[$product_id])) {
                $live_product = $this->live_products[$product_id];
                if (stripos($live_product['name'], "ON SALE") == FALSE && stripos($live_product['sku'], "NEWUN") === FALSE) {
                    $doupdprice = false;
                    if(strval($live_product['retail_price']) != strval($product['RRP']) && $product['In Stock'] == 'Y' && 
                            (floatval($product['RRP']) > floatval($product['Price'])) &&
                            (floatval($live_product['price']) < floatval($product['RRP']))){
                            $doupdprice = true;
                } elseif (strval($live_product['cost_price']) != strval($product['Price']) && $product['Price'] != 0 && $product['In Stock'] == 'Y' && (floatval($product['RRP']) > floatval($product['Price'])))  {
                        $fieldd = array();
                       /* $fieldd = $this->get_gst($product_id, $fieldd);
                         if($fieldd['tax_class_id'] == 1)  {
                             $calcf = $product['Price']*1.1;
                             if(floatval($live_product['cost_price']) < $calcf){
                                 $doupdprice = true;
                             }
                         } else*/
                             $doupdprice = true;
                    }
                    if($doupdprice === true){
                        if ($live_product['sale_price'] != 0) {
                            $newsaleprice = floatval($product['RRP']) - (floatval($product['RRP']) * 8 / 100);
                           /* if ($live_product['sale_price'] > $newsaleprice && $newsaleprice > floatval($product['Price'])) {
                                $newsaleprice = $live_product['sale_price'];
                            } elseif ($live_product['sale_price'] > $newsaleprice && $live_product['sale_price'] <= $product['Price']) {
                                $newsaleprice = 0;
                            } elseif ($live_product['sale_price'] <= $newsaleprice && $newsaleprice <= floatval($product['Price'])) {
                                $newsaleprice = 0;
                            }*/
                        } else
                            $newsaleprice = 0;
                        $fields = array(
                            "retail_price" => $product['RRP'],
                            "price" => $live_product['price']>$product['RRP']?$live_product['price']:$product['RRP'],
                            "cost_price" => $product['Price'],
                            "calculated_price" => $product['RRP'],
                            "sale_price" => $newsaleprice
                        );
                        $fields = $this->get_gst($product_id, $fields);
                       /* if($fields['tax_class_id'] == 1)  {
                            $fields['cost_price'] = $product['Price']*1.1;
                        }
                        if($live_product['sale_price'] <= $fields['cost_price']){
                            $fields['sale_price'] = 0;
                        }
                        if($live_product['cost_price'] > $fields['cost_price']){
                            $fields["cost_price"] = $live_product['cost_price'];
                        }*/
                        if ($newsaleprice < $fields['cost_price']) {
                            $fields['sale_price'] = 0;
                        }
                   
                        fwrite($this->myFile3, $live_product["sku"] . "," . $live_product['price'] . "," . $fields['price'] . "," . $live_product['retail_price'] . "," . $fields['retail_price']
                        . "," . $live_product['cost_price'] . "," . $fields['cost_price'] . "," . $live_product['sale_price'] . "," . $fields['sale_price'] . PHP_EOL);
                        $manager->update_product($fields, $live_product['id']);
                    } elseif (strval($live_product['retail_price']) != strval($product['RRP']) && $product['In Stock'] == 'Y' && (floatval($product['RRP']) <= floatval($product['Price'])) //&&
                    /* (floatval($live_product['price']) < floatval($product['RRP'])) */) {
                      //  fwrite($this->myFile4, $live_product["sku"] . PHP_EOL);
                    }
                }
            }
        }

        /* foreach($this->products as $product_id => $product) {
          $live_product = $this->live_products[$product_id];
          if (isset($live_product) && $live_product != NULL) {
          if ($live_product['retail_price'] != $product['RRP'] && $product['Deactivated'] == NULL && ($product['RRP'] > $product['Price'])) {
          $fields = array(
          "retail_price"         => $product['RRP'],
          "price"                => $product['RRP'],
          "cost_price"           => $product['Price']
          );
          $manager->update_product($fields, $live_product['id']);
          }
          }
          } */
    }

    public function set_feed_products() {
        $handle = fopen($this->url, "r");
        $s = array();
        $row = 1;
        if ($handle !== FALSE) {
            while (($val = fgetcsv($handle, 0, ",")) !== FALSE) {
                $num = count($val);
                $csvdata = array();
                if ($row == 1) {
                    for ($c = 0; $c < $num; $c++) {
                        if (isset($val[$c])) {
                            $columns[$c] = $val[$c];
                        }
                    }
                } else {
                    for ($c = 0; $c < $num; $c++) {
                        $csvdata[$columns[$c]] = $val[$c];
                    }
                    $s[$csvdata['SKU']] = $csvdata;
                }
                $row++;
            }
            fclose($handle);
        }
        if (!empty($s)) {
            // Log
            $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($s) . " products in CSV.\n";
            fwrite($this->myFile, $txt);
            $this->products = $s;
            return true;
        }
        return false;
    }

    public function get_one_product_sku($sku) {
        $skucode = trim(explode("UN -", $sku)[1]);
        $handle = fopen($this->url, "r");
        $s = array();
        $row = 1;
        if ($handle !== FALSE) {
            while (($val = fgetcsv($handle, 0, ",")) !== FALSE) {
                $num = count($val);
                $csvdata = array();
                if ($row == 1) {
                    for ($c = 0; $c < $num; $c++) {
                        if (isset($val[$c])) {
                            $columns[$c] = $val[$c];
                        }
                    }
                } else {
                    for ($c = 0; $c < $num; $c++) {
                        $csvdata[$columns[$c]] = $val[$c];
                    }
                    if ($csvdata['SKU'] == $skucode) {
                        fclose($handle);
                        return $csvdata;
                    }
                }
                $row++;
            }
            fclose($handle);
        }
        return false;
    }

    // Take products from CSV and put them into an array
    public function set_feed_products_ini() { // some errors generated here
        $feed = file_get_contents($this->url);

        $rows = explode("\n", $feed);
        $products_feed = array();

        foreach ($rows as $key => $row) {
            $row1 = $row;
            $m = explode(",", $row1);

            $i = 0;
            $products_feed[$key] = $m;
        }

        $columns = $products_feed[0];
        foreach ($columns as $key => $value) {
            $columns[$key] = count(explode("\"", $value)) > 1 ? explode("\"", $value)[1] : $value;
        }

        unset($products_feed[0]);
        $s = array();
        foreach ($products_feed as $key => $product) {
            $index = 0;
            $s[$product[0]] = [];
            foreach ($product as $key1 => $att) {
                $s[$product[0]][$columns[$index++]] = $att;
            }
        }

        if (!empty($s)) {
            // Log
            $txt = "[" . date("Y-m-d h:i:sa") . "] [Uhp] " . count($s) . " products in CSV.\n";

            fwrite($this->myFile, $txt);

            $this->products = $s;
            return TRUE;
        }
        return FALSE;
    }

    public function get_big_commerce_products($file) {
        $boo_products = file_get_contents("http://buyorganicsonline.dev.nextlogic.ro/storage/{$file}.json");
        return json_decode($boo_products);
    }

    public function filter_uhp_from_live_products() {
        $bc_products = $this->get_big_commerce_products('boo_file');
        $uhp_products = array();

        foreach ($bc_products as $id => $product) {
            if (strpos($product->sku, 'UN - ') === 0) {
                $uhp_products[$id] = ['sku' => $product->sku,
                    'categories' => $product->categories];
            }
        }
        return $uhp_products;
    }

    public function filter_OF_from_live_products() {
        $bc_products = $this->get_big_commerce_products('boo_file');
        $of_products = array();

        foreach ($bc_products as $id => $product) {
            if (strpos($product->sku, 'OF - ') === 0) {
                $of_products[$id] = ['sku' => $product->sku,
                    'categories' => $product->categories];
            }
        }
        return $of_products;
    }

    public function attach_new_category(&$categories, $new_category) {
        $categories[] = $new_category;
    }

    public function insert_uhp_in_category() {
        $manager = new Api_manager();
        // $products = $this->filter_uhp_from_live_products();
        $products = $this->filter_OF_from_live_products();
        $count = 1000;
        foreach ($products as $id => $product) {

            if ($count > 0 && $id > 11078) {
                $this->attach_new_category($products[$id]['categories'], $this->category);
                $fields = array("categories" => $products[$id]['categories']);
                $manager->update_product($fields, $id);
                $count--;
            }

            if ($count <= 0) {
                break;
            }
        }
    }

    public function check_swim($live_product) {
        $manager = new Api_manager();
        if ($live_product) {
            try {

                $manager->update_product(array("bin_picking_number" => "yes"), $live_product['id']);
                //  if($live_product['inventory_level'] > 85 && $live_product['is_visible'] == true){
                //       fwrite($this->myFile2, $live_product["id"] . ',' . $live_product["sku"]. ','.$live_product['inventory_level'].','.$live_product['inventory_tracking'].','.$live_product['availability'] . PHP_EOL);
                // $manager->update_product(array("inventory_level" => 0), $live_product['id']);
                //   }
                // if ($live_product['inventory_tracking'] == "none" && $live_product['is_visible'] == true && $live_product['availability'] == "disabled" && $live_product['is_price_hidden'] == true) {
                //   $manager->update_product(array("is_price_hidden" => false, "inventory_level" => 0), $live_product['id']);
                //   fwrite($this->myFile, $live_product["id"] . ',' . $live_product["sku"] . PHP_EOL);
                //  } else {
                //     if ($live_product['inventory_tracking'] == "product" && $live_product['is_visible'] == true && $live_product['availability'] == "disabled" && $live_product['is_price_hidden'] == true) {
                //  $manager->update_product(array("is_price_hidden" => false), $live_product['id']);
                //  fwrite($this->myFile2, json_encode($live_product) . PHP_EOL);
                //     }
                //   }
            } catch (Exception $e) {
                echo json_encode($live_product);
            }
        }
    }

    public function set_changed_and_new_products() {
        $manager = new Api_manager();
        $manager->set_products(1, $this->category);
        $this->live_products = $manager->get_products();

        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Uhp] " . count($this->live_products) . " products on live (Uhp category).\n";

        fwrite($this->myFile, $txt);
        $active_products = array();
        $new = array();

        foreach ($this->products as $sku => $value) {
            //new products
            if (!isset($this->live_products[$sku])) {
                $new[] = $sku;
            } else {
                //     $this->check_swim($this->live_products[$sku]);
                $active_products[$sku] = $value;
            }
        }

        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Uhp] " . count($new) . " new products which are in CSV, but not on live.\n";

        fwrite($this->myFile, $txt);

        $this->set_changed_products($active_products);
        // $this->new_products = $new;
        //  $this->insert_new_products_on_live();
        // $this->test_live_csv_rrp($active_products);
    }

    public function set_changed_products($active_products) {
        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Uhp] " . count($active_products) . " active products from CSV.\n";
        fwrite($this->myFile, $txt);
        foreach ($active_products as $sku => $value) {
            $status = $value['In Stock']; //$value['Isactive'];//
            if ($this->is_status($status, $sku) == TRUE) {
                $this->changed_products[$status][$sku] = $this->live_products[$sku]['id'];
            }
        }
    }

    public function is_status($status, $sku) {
        $product = $this->live_products[$sku];
        if (in_array($this->review_products_category, $product['categories']) || in_array($this->disabled_category, $product['categories']))
            return false;

//echo $product['is_visible'] . " =>" .($product['is_visible'] == FALSE?"true":"false") . " - ". $product['availability']."=>".($product['availability'] == 'available'?"true":"false").
        //      " - ". $product['is_price_hidden'] ."=>". ($product['is_price_hidden'] == FALSE?"true":"false") ." - ". $product['price_hidden_label'] . "<br><br>";
        if ($status == 'N') {
            if ($product['is_visible'] == FALSE || $product['availability'] == 'available' /* ||  $product['is_price_hidden'] == FALSE || $product['price_hidden_label'] != 'This product is disabled' */) {
                return TRUE;
            }
        }

        if ($status == 'Y') {
            $new_uhp_category = 1218;
            // if (($product['is_visible'] == FALSE || $product['availability'] == 'disabled' /* ||  $product['is_price_hidden'] == TRUE || $product['price_hidden_label'] != '' */)
            //                 ($product['availability'] == 'available' && $product['inventory_level'] == 0)
            // /*  && !in_array($new_uhp_category, $product['categories']) */) {
            if ($product['is_visible'] == FALSE || $product['availability'] == 'disabled' ||
                    ($product['availability'] == 'available' && $product['inventory_level'] == 0)) {
                return TRUE;
            }
        }
        return FALSE;
    }

    public function do_categs_update_products() {
        $manager = new Api_manager();
        //  $category_query_array = array($this->category, "514", "515", "1144", "979", "1236", "983", "1099", "414", "31", "416", "493", "625", "741", "1345","1575", "1576", "498");
        $active_products = array();
        $new = array();
        $manager->set_products(1, $this->category);
        $this->live_products = $manager->get_products();
        $cc = 0;

//        $fields = array("categories" => [579,938,1011]);
//          $manager->update_product($fields, 156);
//          return false;


        foreach ($this->products as $sku => $value) {
            if (!isset($this->live_products[$sku])) {

                $rdata = $manager->get_products_by_sku($sku);
                if ($rdata != '0') {
                    $rdata->categories[] = $this->category;

                    $fields = array("categories" => $rdata->categories);
                    $manager->update_product($fields, $rdata->id);


                    echo '/n' . $rdata->id . "  ";
                    //  $active_products[$sku] = $value;
                } else {
                    //    $new[] = $sku;
                }
            }
        }
        echo '-----------------------------------------------------------';
        //  echo json_encode($new);
        //   $this->set_changed_products($active_products);
    }

    public function get_review_prods() {
        $manager = new Api_manager();
        $manager->set_products_all(1, $this->review_products_category);
        $rev = $manager->get_products();
        return $rev;
    }

    public function insert_new_products_on_live() {
        $new_products = $this->new_products;
        $feed_products = $this->products;
        $manager = new Api_manager();
        $manager->set_brands();
        $brands = $manager->get_brands();
        // var_dump(count($new_products));
        // exit();
        $review_prods = $this->get_review_prods();
        $k = 0;
        $countnew = 0;
        $categories = [$this->new_products_category, $this->category, $this->review_products_category];
        foreach ($new_products as $key => $sku) {
            if (isset($review_prods) && !isset($review_prods['UN - ' . $feed_products[$sku]['SKU']]) && !isset($review_prods['NEWUN - ' . $feed_products[$sku]['SKU']])) {
                /*   $brand_name = $feed_products[$sku]['Brand'];
                  if (strpos($brand_name, "\"") !== FALSE) {
                  $brand_name = explode("\"", $brand_name)[1];
                  }
                  // var_dump($brand_name);
                  // var_dump($brands[ucfirst(strtolower($brand_name))]);
                  // var_dump($this->parse_brand_name($brands, $brand_name));exit();
                  if (!$this->brand_exists($brands, $brand_name) && $brand_name != null) {
                  $brand_data = array(
                  "name" => $brand_name,
                  "page_title" => $brand_name . ' | Buy Organics Online',
                  "meta_keywords" => array($brand_name),
                  "search_keywords" => $brand_name,
                  "custom_url" => array(
                  "url" => "/brands/" . preg_replace(array('/( & )/', '/ +/', '/\d/', '/&/'), array("-", "", "-", "-"), $brand_name) . ".html", //. str_replace(" ", "-", $brand_name) . ".html",
                  "is_customized" => FALSE
                  )
                  );

                  $branddata = $manager->insert_brand($brand_data);
                  if (isset($branddata['data'])) {
                  $brand_id = $branddata['data'];
                  $brands[$brand_id['name']] = $brand_id['id'];
                  $id_brand = $brand_id['id'];
                  }
                  // $brand_id = $manager->insert_brand($brand_data)->data;
                  //    $brands[$brand_id->name] = $brand_id->id;
                  //   $id_brand = $brand_id->id;
                  } else {
                  $id_brand = $brands[$this->parse_brand_name($brands, $brand_name)];
                  }

                  $weight = $this->parse_weight($feed_products[$sku]['Size']);
                  // var_dump($feed_products[$sku]['Size'], $weight);

                  $data = array(
                  'name' => $feed_products[$sku]['Description'],
                  'title' => $feed_products[$sku]['Description'],
                  'sku' => 'NEWUN - ' . $feed_products[$sku]['SKU'],
                  'brand_id' => $id_brand,
                  'retail_price' => $feed_products[$sku]['RRP'],
                  'price' => $feed_products[$sku]['RRP'],
                  'cost_price' => $feed_products[$sku]['Price'],
                  'categories' => $categories,
                  'type' => 'physical',
                  'weight' => $weight,
                  'upc' => $feed_products[$sku]['Barcode'],
                  'inventory_level' => 0,
                  'inventory_tracking' => "product",
                  'is_visible' => FALSE,
                  'availability' => 'disabled',
                  "images" => array(array("image_url" => "{replimg}", "is_thumbnail" => true, "sort_order" => 1, "description" => $feed_products[$sku]['description']))
                  //'image_url' => $feed_products[$sku]['Imageurl'],
                  );
                 */
                // var_dump($feed_products[$sku]['Isactive']);
                if ($feed_products[$sku]['Isactive'] == 'Y') {

                    // $manager->insert_product($data);
                    //   $stock_status = $this->set_stockstatus($feed_products[$sku]['Isactive']);
                    //    $data = $data + $stock_status;
                    // var_dump($feed_products[$sku]['Isactive']);
                    // var_dump($id_brand);
                    // var_dump($data);
                    //  $status = $manager->insert_product($data);
                    // var_dump($status);
                    $countnew += 1;
                    echo " add NEWUN - " . $feed_products[$sku]['SKU'] . PHP_EOL;
                    /*    do {
                      $encdata = json_encode($data);
                      $senddata = str_replace("{replimg}", stripcslashes($feed_products[$sku]['Imageurl']), $encdata);
                      $status = $manager->insert_product(str_replace("{replimg}", stripcslashes($feed_products[$sku]['Imageurl']), $encdata));
                      if (isset($status) && !isset($status['errors'])) {
                      $countnew += 1;
                      $stop = true;
                      } else {
                      if ($status['title'] === 'The product name is a duplicate' || $status['title'] === "The field 'image_url' is invalid.") {
                      if ($status['title'] === 'The product name is a duplicate') {
                      if ($errstep > 0) {
                      $data['name'] .= ' 2';
                      } else
                      $data['name'] .= ' ' . $data['weight'] . " - " . $brand_found_name;
                      }
                      if ($status['title'] === "The field 'image_url' is invalid.") {
                      unset($data['images']);
                      }
                      if ($errstep == 3) {
                      $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac]  error adding new prod " . $data['sku'] . ".\n";
                      fwrite($this->myFile, $txt);
                      }
                      $errstep += 1;
                      } else {
                      $stop = true;
                      $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac]  error adding new prod " . $data['sku'] . ".\n";
                      fwrite($this->myFile, $txt);
                      }
                      }
                      } while ($stop != true && $errstep <= 3); */
                    //  exit();
                }
            }
        }
        echo '>> newprods>>' . $countnew;
        // var_dump($k);
    }

    /*
      function insert_new_products_on_live($feed, $uhp) {
      //   $feed = file_get_contents("supplier_5f60e3088f652.json");
      //insert_new_products_on_live($feed, $uhp);

      $new_products = json_decode($feed, true); // ->json
      //     $feed_products = $this->products;
      $manager = new Api_manager();
      $manager->set_brands();
      $brands = $manager->get_brands();
      $k = 0;
      $countnew = 0;
      $categories = [1040, 1345, 1687];

      foreach ($new_products as $key => $feed_products) {

      $brand_name = $feed_products['brand'];
      if (strpos($brand_name, "\"") !== FALSE) {
      $brand_name = explode("\"", $brand_name)[1];
      }
      if (!$uhp->brand_exists($brands, $brand_name) && isset($brand_name)) {
      $brand_data = array(
      "name" => $brand_name,
      "page_title" => $brand_name . ' | Buy Organics Online',
      "meta_keywords" => array($brand_name),
      "search_keywords" => $brand_name,
      "custom_url" => array(
      "url" => "/brands/" . preg_replace(array('/( & )/', '/ +/', '/\d/', '/\'/', '/&/'), array("-", "", "-","", "-"), $brand_name) . ".html", //. str_replace(" ", "-", $brand_name) . ".html",
      "is_customized" => FALSE
      )
      );

      $branddata = $manager->insert_brand($brand_data);
      if (isset($branddata['data'])) {
      $brand_id = $branddata['data'];

      $brands[$brand_name] = $brand_id['id'];
      $id_brand = $brand_id['id'];
      }
      } else {
      $id_brand = $brands[$uhp->parse_brand_name($brands, $brand_name)];
      }
      if(!isset($id_brand)) {echo "!!!nobrand - ".$feed_products['sku']." ". $brand_name.'<br>'.PHP_EOL;
      continue;}
      $weight = $uhp->parse_weight($feed_products['size']);
      $data = array(
      'name' => $feed_products['description'],
      'title' => $feed_products['description'],
      'sku' => 'NEWUN - ' . $feed_products['sku'],
      'brand_id' => $id_brand,
      'retail_price' => $feed_products['rrp'],
      'price' => $feed_products['rrp'],
      'cost_price' => $feed_products['price'],
      'categories' => $categories,
      'type' => 'physical',
      'weight' => $weight,
      'upc' => $feed_products['barcode'],
      'gtin' => $feed_products['barcode'],
      'inventory_level' => 0,
      'inventory_tracking' => "product",
      'is_visible' => FALSE,
      'availability' => 'disabled',
      'tax_class_id' = ($feed_products['Tax'] == 'Y' ? 0 : 1),
      "images" => array(array("image_url" => "{replimg}", "is_thumbnail" => true, "sort_order" => 1, "description" => $feed_products['description']))
      //'image_url' => $feed_products[$sku]['Imageurl'],
      );


      $countnew += 1;
      echo " add NEWUN - " . $feed_products['sku'] ."<br>". PHP_EOL;
      do {
      $encdata = json_encode($data);
      $senddata = str_replace("{replimg}", stripcslashes($feed_products['imageurl']), $encdata);
      $status = $manager->insert_product(str_replace("{replimg}", stripcslashes($feed_products['imageurl']), $encdata));
      if (isset($status) && !isset($status['errors'])) {
      $countnew += 1;
      $stop = true;echo 'added' ."<br>". PHP_EOL;
      } else {
      if ($status['title'] === 'The product name is a duplicate' || $status['title'] === "The field 'image_url' is invalid.") {
      if ($status['title'] === 'The product name is a duplicate') {

      $stop = true;
      }
      if ($status['title'] === "The field 'image_url' is invalid.") {
      unset($data['images']);
      }
      $errstep += 1;
      echo $feed_products['sku'].'>>error '.$status['title']."<br>" . PHP_EOL;
      return true;
      } else { echo $feed_products['sku'].'>>error '.$status['title']."<br>" . PHP_EOL;
      $stop = true;
      }
      }
      } while ($stop !== true && $errstep <= 2);
      //  exit();
      //   }
      //   }
      //  return true;
      }
      //  echo '>> newprods>>' . $countnew;
      // var_dump($k);
      } */

    public function parse_weight($weight) {
        $position = '';

        if (strpos($weight, 'x') !== FALSE) {
            return 0;
        }
        if (strpos($weight, 'L') !== FALSE) {
            $position = strpos($weight, 'L');
        }
        if (strpos($weight, 'm') !== FALSE) {
            $position = strpos($weight, 'm');
        }
        if (strpos($weight, 'g') !== FALSE) {
            $position = strpos($weight, 'g');
        }
        if (strpos($weight, 'k') !== FALSE) {
            $position = strpos($weight, 'k');
        }

        if ($position == '') {
            return 0;
        }
        return (int) substr($weight, 0, $position);
    }

    public function set_stockstatus($status) {
        if ($status == 'N') {
            return $this->set_outofstock();
        }

        if ($status == 'Y') {
            return $this->set_available();
        }
    }

    // Remove category from existing categories of a product
    public function unset_category(&$categories, $to_be_unset_category) {
        $key = array_search($to_be_unset_category, $categories);
        if ($key !== FALSE) {
            unset($categories[$key]);
        }
    }

    // Set the fields for available update function
    public function set_available($new, $categories, $inventory_update) {
        $this->unset_category($categories, 1221);
        $fields = array(
            "is_visible" => TRUE,
            'availability' => 'available',
            "price_hidden_label" => '',
            "is_price_hidden" => FALSE,
            //  "inventory_level" => 100,
            "categories" => $categories
        );
        if ($inventory_update == true)
            $fields["inventory_level"] = 1000;

        if ($new === TRUE) {
            $fields['is_visible'] = FALSE;
            $fields['availability'] = 'disabled';
        }
        return $fields;
    }

    public function brand_exists($brands, $brand_name) {
        if ($this->parse_brand_name($brands, $brand_name, "true") !== false) {
            return true;
        } else {
            return false;
        }
    }

    public function parse_brand_name($brands, $brand_name, $find = NULL) {
        if (isset($find)) {
            foreach ($brands as $bn => $id) {
                if (strtolower(trim($brn)) == strtolower(trim($brand_name))) {
                    return $brn;
                }
                $strb = preg_replace('/[\'?!\-\,\s+]/', '', $bn);
                $strn = preg_replace('/[\'?!\-\,\s+]/', '', $brand_name);
                if (strtolower(trim($strb)) == strtolower(trim($strn))) {
                    return ucwords(strtolower($brand_name));
                }
            }
        } else {
            /*   foreach (explode(" ", $brand_name) as $i) {
              $brand_customized .= ucfirst(strtolower($i)) . ' ';
              }

              $brand_customized = substr($brand_customized, 0, -1);
             */
            if ($brands[$brand_name] != null) {
                return $brand_name;
            }

            if ($brands[strtoupper($brand_name)] != null) {
                return strtoupper($brand_name);
            }

            if ($brands[ucfirst(strtolower($brand_name))] != null) {
                return ucfirst(strtolower($brand_name));
            }

            if ($brands[ucfirst($brand_name)] != null) {
                return ucfirst($brand_name);
            }

            if ($brands[$brand_customized] != null) {
                return $brand_customized;
            }
            foreach ($brands as $brn => $brid) {
                if (strtolower(trim($brn)) == strtolower(trim($brand_name))) {
                    return $brn;
                }
                $strb = preg_replace('/[\'?!\-\,\s+]/', '', $brn);
                $strn = preg_replace('/[\'?!\-\,\s+]/', '', $brand_name);
                if (strtolower(trim($strb)) == strtolower(trim($strn))) {
                    return $brn;
                }
            }
        }
        return false;
    }

    public function parse_sku($sku) {
        // var_dump($sku);
        $without_kad_pos = 5;
        $without_ipdc_pos = strpos($sku, ' (');
        $without_ipdc_pos1 = strpos($sku, '(');
        $without_and_pos = strpos($sku, ' &');
        $without_dot_pos = strpos($sku, '.');

        if ($without_ipdc_pos !== FALSE) {
            return substr($sku, $without_kad_pos, $without_ipdc_pos - $without_kad_pos);
        }

        if ($without_ipdc_pos1 !== FALSE) {
            return substr($sku, $without_kad_pos, $without_ipdc_pos1 - $without_kad_pos);
        }

        // if ($without_dot_pos !== FALSE) {
        //     return substr($sku, $without_kad_pos, $without_dot_pos - $without_kad_pos);
        // }

        if ($without_and_pos === FALSE) {
            return substr($sku, $without_kad_pos);
        } else {
            return substr($sku, $without_kad_pos, $without_and_pos - $without_kad_pos);
        }
    }
  /*  private function update_price1($manager) {
        foreach ($this->products as $product_id => $product) {
            if (isset($this->live_products[$product_id])) {
                $live_product = $this->live_products[$product_id];
                if (stripos($live_product['name'], "ON SALE") == FALSE && stripos($live_product['sku'], "NEWUN") === FALSE) {
                    if (strval($live_product['cost_price']) != strval($product['Price']) && $product['Price'] != 0)  {
                    //    fwrite($this->myFile4, $live_product["sku"] . PHP_EOL);
                        $fields = array(
                            "cost_price" => $product['Price']
                        );
                        $manager->update_product($fields, $live_product['id']);
                    } 
                }
            }
        }
    }
    public function do_bulk_update_price($manager = NULL, $page = 1, $step = 1) {
        if (!$manager) {
            $this->newun = array();
            $manager = new Api_manager();
        } else {
            $manager->reset_prods();
        }
        $no_pages = 20;
        $rm = $manager->set_products($page, $this->category, false, false, $no_pages * $step);

        $this->live_products = $manager->get_products();
        $this->update_price1($manager);

        if (($page + $no_pages) <= $manager->get_total_pages()) {
            $step += 1;
            $do = $this->do_bulk_update_price($manager, $page + $no_pages, $step);
        } else {
            //read all pages from BC, will see if there are new products
            //  $this->check_new_products($manager->get_sku_all_prods());
        }
    }*/
    public function do_bulk_update($manager = NULL, $page = 1, $step = 1) {
        if (!$manager) {
            $this->newun = array();
            $manager = new Api_manager();
        } else {
            $manager->reset_prods();
        }
        $no_pages = 20;
        $rm = $manager->set_products($page, $this->category, false, false, $no_pages * $step);

        $this->live_products = $manager->get_products();

        $active_products = array();

        foreach ($this->products as $sku => $value) {
            if (isset($this->live_products[$sku]) && $this->live_products[$sku]['sku'] != 'NEWUN - ' . $sku) {
                $active_products[$sku] = $value;
            } else if (isset($this->live_products[$sku]) && $this->live_products[$sku]['sku'] == 'NEWUN - ' . $sku) {
                // $this->newun[$sku] = "";
            }
        }

        foreach ($this->live_products as $sku => $value) {
            if (!isset($this->products[$sku])) {
                $this->live_products[$sku]['sku'] = str_replace("\"", "", $this->live_products[$sku]['sku']);
                if (!preg_match("/[&\(]/i", $this->live_products[$sku]['sku']) && strpos($this->live_products[$sku]['sku'], 'N -') > 0) {
                    if ($this->live_products[$sku]['inventory_level'] > 300 || $this->live_products[$sku]['inventory_level'] == 0) {
                        $categories = $this->live_products[$sku]['categories'];
                        if (!in_array(1221, $categories) && $this->live_products[$sku]['is_visible'] == true) {
                            if (strpos($this->live_products[$sku]['sku'], 'OLD') === false) {
                                $fields = $this->set_discontinued($categories);
                                $manager->update_product($fields, $this->live_products[$sku]['id']);
                                $this->writeToOutofStockCSV($this->live_products[$sku]['sku'], $this->live_products[$sku]['id'], "set discontinued");
                            }
                        }
                    }
                }
            }
        }

        $this->changed_products = array();
        $this->set_changed_products($active_products);
        $this->update_outofstock($manager);
        // $this->update_discontinued($manager);
        $this->update_available($manager);
        $this->update_price($manager);

        if (($page + $no_pages) <= $manager->get_total_pages()) {
            $step += 1;
            $do = $this->do_bulk_update($manager, $page + $no_pages, $step);
        } else {
            //read all pages from BC, will see if there are new products
            //  $this->check_new_products($manager->get_sku_all_prods());
        }
    }

    private function check_new_products($live_all_products) {
        $this->new_products = array();
        foreach ($this->products as $sku => $value) {
            if (!isset($live_all_products[$sku]) && ($value['RRP'] > $value['Price'] || ($value['RRP'] == 0 && $value['Price'] > 0))) {
                if ($value['Isactive'] == 'Y' && !isset($this->newun[$sku])) {
                    $this->new_products[] = $sku;
                }
            }
        }
        if (isset($this->new_products) && count($this->new_products) > 0) {
            //   echo json_encode($this->new_products);
            // $this->insert_new_products_on_live();
        }
    }

    public function update() {
        /* $manager = new Api_manager();
          $this->update_outofstock($manager);
          $this->update_available($manager);
          //    $this->update_price($manager);
          // Close the writing file
          fclose($this->myFile); */
    }

    private function can_be_updated($prodid, $toactive = NULL) {
        foreach ($this->live_products as $kid => $live_product) {
            if ($live_product['id'] == $prodid) {
                if ($live_product['inventory_level'] <= 300 && $live_product['inventory_level'] > 0) {
                    //  echo $live_product['inventory_level'] . ' - ' . $live_product['sku'] . PHP_EOL;
                    return false;
                } elseif (isset($toactive) && stripos($live_product['name'], "ON SALE") !== FALSE && $live_product['inventory_level'] == 0 /* && $live_product['inventory_tracking'] == "none" */) {
                    return false;
                } else
                    return true;
            }
        }
        return true;
    }

    private function writeToOutofStockCSV($sku, $id, $status) {
        file_put_contents($this->myFileoutofstock, $sku . "," . $id . "," . $status . PHP_EOL, FILE_APPEND);
    }

    private function get_gst($sku, $fields) {
        if (isset($this->products[$sku]) && isset($this->products[$sku]['Tax'])) {
            $fields['tax_class_id'] = $this->products[$sku]['Tax'] == 'Y' ? 0 : 1;
        }
        return $fields;
    }

    public function update_outofstock($manager) {
        $products = array();
        if (isset($this->changed_products['N'])) {
            $products = $this->changed_products['N'];
            foreach ($products as $kid => $id) {
                if ($this->can_be_updated($id)) {
                    //  fwrite($this->myFile2, $this->live_products[$kid]['sku'].' to unav '. ' - inv '. $this->live_products[$kid]['inventory_level']. PHP_EOL);
                    $inv_update = $this->get_product_inventory_update($products[$kid]);
                    $fields = $this->set_outofstock($inv_update);
                    $fields = $this->get_gst($kid, $fields);
                    $this->writeToOutofStockCSV($kid, $id, "set outofstock");
                    $manager->update_product($fields, $id);
                }
            }
        }
        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Uhp] " . count($products) . " out of stock products have been changed.\n";

        fwrite($this->myFile, $txt);
    }

    private function get_product_inventory_update($prodid) {
        foreach ($this->live_products as $kid => $live_product) {
            if ($live_product['id'] == $prodid) {
                if ($live_product['inventory_level'] <= 300 && $live_product['inventory_level'] > 0) {
                    return false;
                } elseif (stripos($live_product['name'], "ON SALE") !== FALSE && $live_product['inventory_level'] == 0) {
                    return false;
                } else
                    return true;
            }
        }
        return false;
    }

    // Set the fields for outofstock update function
    public function set_outofstock($inventory_update) {
        $fields = array(
            "is_visible" => TRUE,
            'availability' => 'disabled',
            // "inventory_level" => 0,
            "price_hidden_label" => 'This product is disabled',
            "is_price_hidden" => FALSE
        );
        if ($inventory_update == true)
            $fields["inventory_level"] = 0;
        return $fields;
    }

    public function set_discontinued($categories) {
        $check_before_removing_category = 1221;
        $this->attach_new_category($categories, $check_before_removing_category);
        $fields = array(
            "is_visible" => false,
            "price_hidden_label" => 'This product has been discontinued',
            "is_price_hidden" => true,
            "categories" => $categories
        );
        return $fields;
    }

    public function update_available($manager) {
        $products = array();
        if (isset($this->changed_products['Y'])) {
            $products = $this->changed_products['Y'];
            foreach ($products as $sku => $id) {
                if ($this->can_be_updated($id, true)) {
                    //    fwrite($this->myFile2, $this->live_products[$sku]['sku'].' to available '. ' - inv '. $this->live_products[$sku]['inventory_level']. PHP_EOL);
                    $categories = $this->live_products[$sku]['categories'];
                    $inv_update = $this->get_product_inventory_update($id);
                    $fields = $this->set_available(FALSE, $categories, $inv_update);
                    $fields = $this->get_gst($sku, $fields);
                    $manager->update_product($fields, $id);
                }
            }
        }

        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Uhp] " . count($products) . " available products have been changed.\n";

        fwrite($this->myFile, $txt);
    }

    public function get_bulk_products($manager = NULL, $page = 1, $step = 1, $count = 0) {
        if (count($this->products) == 0)
            return false;
        if (!$manager) {
            $manager = new Api_manager();
        } else {
            $manager->reset_prods();
        }
        $no_pages = 20;
        $rm = $manager->set_products_all($page, false, false, false, $no_pages * $step);

        $this->live_products = $manager->get_products();

        foreach ($this->live_products as $sku => $value) {
            if (isset($this->live_products[$sku]) && ((strpos($this->live_products[$sku]['sku'], 'UN') !== FALSE && strpos($this->live_products[$sku]['sku'], 'UN') >= 0 && strpos($this->live_products[$sku]['sku'], 'UN') < 3) ||
                    (strpos($this->live_products[$sku]['sku'], 'NEWUN') !== FALSE && strpos($this->live_products[$sku]['sku'], 'NEWUN') >= 0 && strpos($this->live_products[$sku]['sku'], 'NEWUN') < 3))
            ) {
                $skucc = explode("-", $sku);
                array_shift($skucc);
                $skuop = implode($skucc);
                $skuop = trim($skuop);
                if (strlen($skuop) > 1 && !isset($this->products[$skuop]) && !in_array('1221', $this->live_products[$sku]['categories']) && $this->live_products[$sku]['is_visible'] == "true" && $this->live_products[$sku]['availability'] == "available") {
                    echo $skuop . ',' . $this->live_products[$sku]['sku'] . PHP_EOL;
                    fwrite($this->myFile2, $skuop . ',' . $this->live_products[$sku]['sku'] . PHP_EOL);
                }
            }
        }
        echo $page + $no_pages . PHP_EOL;
        if (($page + $no_pages) <= $manager->get_total_pages()) {
            $step += 1;
            $do = $this->get_bulk_products($manager, $page + $no_pages, $step);
        }
        /* if (!$manager) {
          $manager = new Api_manager();
          } else {
          $manager->reset_prods();
          }
          //  $count = 0;
          $no_pages = 20;
          $rm = $manager->set_products_all($page, false, false, false, $no_pages * $step);
          $this->live_products = $manager->get_products();
          foreach ($this->live_products as $sku => $value) {
          if (isset($this->live_products[$sku]) && ((strpos($this->live_products[$sku]['sku'], 'UN') !== FALSE && strpos($this->live_products[$sku]['sku'], 'UN') >= 0 && strpos($this->live_products[$sku]['sku'], 'UN') < 3)
          ) && !in_array(1671, $this->live_products[$sku]['categories']) ) {
          $skucc = explode(" - ", $sku);
          array_shift($skucc);
          $skuop = implode($skucc);
          if (strlen($skuop) > 1 && !isset($this->products[$skuop])) {
          echo $this->live_products[$sku]['id'] . ' > ' . $skuop . ' - ' . $this->live_products[$sku]['sku'] . PHP_EOL;
          $count += 1;
          $this->live_products[$sku]['categories'][] = 1690;
          $manager->update_product(array("categories" => $this->live_products[$sku]['categories'], "bin_picking_number" => "notfound"), $this->live_products[$sku]['id']);
          fwrite($this->myFile2, 'check  - ' . $this->live_products[$sku]['sku'] . PHP_EOL);
          }
          //         $this->live_products[$sku]['categories'][] = $this->review_products_category;
          //       $manager->update_product(array("categories" => $this->live_products[$sku]['categories']), $this->live_products[$sku]['id']);
          //       echo $sku . " - " . json_encode($this->live_products[$sku]['categories']);
          //   fwrite($this->myFile2, 'check - ' . $this->live_products[$sku]['sku'] . PHP_EOL);
          // $manager->update_product(array("is_price_hidden" => false), $live_product['id']);
          }
          }

          echo $count . " >> " . ($page + $no_pages) . PHP_EOL;
          if (($page + $no_pages) <= $manager->get_total_pages()) {
          $step += 1;
          $do = $this->get_bulk_products($manager, $page + $no_pages, $step, $count);
          } */
    }

}
