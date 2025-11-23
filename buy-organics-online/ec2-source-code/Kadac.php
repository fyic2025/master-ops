<?php

use Bigcommerce\Api\Client as Bigcommerce;

include_once 'Supplier.php';

include_once 'Api_manager.php';

require 'vendor/autoload.php';

require 'config/database.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

class Kadac implements Supplier {

    private $name;
    private $url;
    private $myFile;
    private $myFile2;
    private $products;
    private $changed_products = array();
    private $new_products;
    private $live_products;
    private $category = 1344;
    private $new_products_category = 1217;
    private $review_products_category = 1685;  // kadac review
    private $disabled_category = 1705;

    //all kadac from cs need 1344 categ

    public function __construct($name, $url) {
        echo '<br><br>start Kadac ' . date("Y-m-d h:i:sa") . '<br>';
        $this->name = $name;
        $this->url = $url;
        $this->myFile = fopen("update_activity.txt", "a") or die("Unable to open file!1");
        // $this->myFile2 = fopen("KAD_prods_checkASAP.csv", "a") or die("Unable to open file!");
        $this->myFile3 = fopen("/var/www/bigcupdate.fyic.com.au/web/KAD_check_price.log", "a") or die("Unable to open file!2");
        $this->myFile4 = fopen("/var/www/bigcupdate.fyic.com.au/web/KAD_prods_prices.csv", "a") or die("Unable to open file!3");


        $this->myFileoutofstock = "/var/www/bigcupdate.fyic.com.au/web/prods_outofstock.csv";
        if (file_exists($this->myFileoutofstock) === true) {
            file_put_contents($this->myFileoutofstock, 'Kadac ' . date("Y-m-d h:i:sa") . PHP_EOL, FILE_APPEND);
        } else {
            file_put_contents($this->myFileoutofstock, 'Kadac ' . date("Y-m-d h:i:sa") . PHP_EOL);
            chmod($this->myFileoutofstock, 0644);
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

    public function test_products_feed() {
        $feed = file_get_contents($this->url);
        print_r("URL (KADAC):==(");
        print_r($this->url);
        print_r(")");
        echo '<br/>';
        $rows = explode("\n", $feed);
        // print_r($rows);
        foreach ($rows as $key => $row) {
            $row1 = $row;
            $m = explode(",", $row1);
            $i = 0;
            $products_feed[$key] = $m;
            print_r("KAD(");
            print_r($products_feed[$key][0]);
            print_r("___");
            print_r($products_feed[$key][5]);
            print_r("(cost_price)___");
            print_r($products_feed[$key][6]);
            print_r("(rrp))");
            echo '<br/>';
        }
    }

    // Take products from CSV and put them into an array
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
                    $s[$csvdata['sku']] = $csvdata;
                }
                $row++;
            }
            fclose($handle);
        }
        if (!empty($s)) {
            // Log
            $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($s) . " products in CSV.\n";
            fwrite($this->myFile, $txt);
            //remove specific SKU
            unset($s[471174]);
            $this->products = $s;
            return true;
        }
        return false;
    }

    public function get_one_product_sku($sku) {
        $skucode = trim(explode("KAD -", $sku)[1]);
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
                    if ($csvdata['sku'] == $skucode) {
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

    public function set_feed_products_ini() {//parsing issues
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
            $columns[$key] = explode("\"", $value)[1];
        }

        unset($products_feed[0]);
        $s = array();
        foreach ($products_feed as $key => $product) {
            $index = 0;
            $s[substr($product[0], 1, -1)] = [];

            foreach ($product as $key1 => $att) {
                $s[substr($product[0], 1, -1)][$columns[$index++]] = count(explode("\"", $att)) > 1 ? explode("\"", $att)[1] : $att;
            }
        }
        if (!empty($s)) {
            // Log
            $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($s) . " products in CSV.\n";
            fwrite($this->myFile, $txt);
            //remove specific SKU
            unset($s[471174]);
            $this->products = $s;
            return true;
        }
        return false;
    }

    // Get buyorganicsonline products from a JSON file. This method is used only as a support.

    public function get_big_commerce_products($file) {
        $boo_products = file_get_contents('http://buyorganicsonline.dev.nextlogic.ro/storage/' . $file . '.json');
        return json_decode($boo_products);
    }

    public function filter_kadac_from_live_products() {
        $bc_products = $this->get_big_commerce_products('boo_file');
        $kadac_products = array();
        foreach ($bc_products as $id => $product) {
            if (strpos($product->sku, 'KAD - ') === 0) {
                $kadac_products[$id] = ['sku' => $product->sku,
                    'categories' => $product->categories];
            }
        }
        return $kadac_products;
    }

    // Attach new category to existing categories of a product

    public function attach_new_category(&$categories, $new_category) {
        if (!in_array($new_category, $categories)) {

            $categories[] = $new_category;
        }
    }

    // Remove category from existing categories of a product

    public function unset_category(&$categories, $to_be_unset_category) {
        $key = array_search($to_be_unset_category, $categories);
        if ($key !== false) {
            unset($categories[$key]);
        }
    }

    // Insert Kadac product to certain category

    public function insert_kadac_in_category() {
        $manager = new Api_manager();
        $products = $this->filter_kadac_from_live_products();
        foreach ($products as $id => $product) {
            $this->attach_new_category($products[$id]['categories'], $this->category);
            $fields = array("categories" => $products[$id]['categories']);
            $manager->update_product($fields, $id);
        }
    }

    public function check_swim($live_product) {
        $manager = new Api_manager();
        if ($live_product) {
            try {
                /* if ($live_product['is_visible'] == true && $live_product["availability"] == "available" && $live_product["inventory_level"] > 50 && $live_product["inventory_level"] < 1000) {
                  $manager->update_product(array("inventory_level" => "1000"), $live_product['id']);
                  } */
                //  $manager->update_product(array("bin_picking_number" => "yes"), $live_product['id']);
                /* if ($live_product['is_visible'] == true) {
                  if ($live_product["inventory_tracking"] == "product" && $live_product["availability"] == "disabled" && $live_product["inventory_level"] != 0) {
                  $manager->update_product(array("availability" => "available"), $live_product['id']);
                  fwrite($this->myFile2, $live_product["id"] . ',' . $live_product["sku"] . ',' . $live_product["name"] . ',' . $live_product["inventory_level"] . ',' . $live_product["inventory_tracking"] . ',' . $live_product["availability"] . PHP_EOL);
                  }
                  } *///W/S ex gst,RRP,GST Status
                /* if ($live_product['inventory_tracking'] == "none" && $live_product['is_visible'] == true && $live_product['availability'] == "disabled" && $live_product['is_price_hidden'] == true) {
                  //   $manager->update_product(array("is_price_hidden" => false,"inventory_level" => 0), $live_product['id']);
                  // fwrite($this->myFile, $live_product["id"].','. $live_product["sku"]. PHP_EOL);
                  } else {
                  if ($live_product['inventory_tracking'] != "none" && $live_product['is_visible'] == true && $live_product['availability'] == "disabled" && $live_product['is_price_hidden'] == true) {
                  $manager->update_product(array("is_price_hidden" => false), $live_product['id']);
                  }
                  } */
            } catch (Exception $e) {
                echo json_encode($live_product);
            }
        }
    }

    public function set_changed_and_new_products() {
        $manager = new Api_manager();
        $manager->set_products(1, $this->category);
        $this->live_products = $manager->get_products();

        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($this->live_products) . " products on live (Kadac category).\n";
        fwrite($this->myFile, $txt);

        $active_products = array();
        $new = array();
        foreach ($this->products as $sku => $value) {
            //new products
            if (!isset($this->live_products[$sku]) && !isset($this->live_products['NEWKAD - ' . $sku])) {
                if ($value['stockstatus'] == 'available' || $value['stockstatus'] == 'outofstock') {
                    $new[] = $sku;
                }
            } else {
                if ($this->live_products[$sku] && $this->live_products[$sku]['sku'] != 'NEWKAD - ' . $sku) {  // if NEWKAD product - edit product and change sku
                    //   $this->check_swim($this->live_products[$sku],$value);
                    $active_products[$sku] = $value;
                }
            }
        }
        if (!isset($this->discontinued))
            $this->discontinued = array();
        foreach ($this->live_products as $sku => $value) {
            if (!isset($this->products[$sku])) {
                if (isset($this->products[trim($sku)]))
                    echo "<br><br> ---" . $sku;
                //   $this->live_products[$sku]['sku'] = str_replace("\"", "", $this->live_products[$sku]['sku']);
                if (!preg_match("/[&\(\.\:]/i", $this->live_products[$sku]['sku'])) {
                    if ($this->live_products[$sku]['inventory_level'] > 300 || $this->live_products[$sku]['inventory_level'] == 0) {
                        $categories = $this->live_products[$sku]['categories'];
                        if (!in_array(1221, $categories) && $this->live_products[$sku]['is_visible'] == true && strpos($this->live_products[$sku]['sku'], 'KAD') !== false) {
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

        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($new) . " new products which are in CSV, but not on live.\n";
        fwrite($this->myFile, $txt);

        $this->set_changed_products($active_products);
        /*
          if (count($new) > 0) {
          try {
          $this->new_products = $new;
          $this->insert_new_products_on_live();
          } catch (Exception $er) {

          }
          } */
    }

    public function get_live_products() {

        return $this->live_products;
    }

    // Set changed products from CSV that have different fields than live products.
    public function get_review_prods() {
        $manager = new Api_manager();
        $manager->set_products_all(1, $this->review_products_category);
        $rev = $manager->get_products();
        return $rev;
    }

    public function get_noupdate_prods() {
        $manager = new Api_manager();
        $manager->set_products_all(1, 1671, false, false, false, true);
        $rev = $manager->get_products();
        return $rev;
    }

    public function set_changed_products($active_products) {

        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($active_products) . " active products from CSV.\n";
        fwrite($this->myFile, $txt);

        foreach ($active_products as $sku => $value) {
            $status = $value['stockstatus'];
            if ($this->is_status($status, $sku) == true) {
                $this->changed_products[$status][$sku] = $this->live_products[$sku]['id'];
            }
        }
    }

    public function insert_new_products_on_live() {
        $new_products = $this->new_products;
        $feed_products = $this->products;

        $manager = new Api_manager();
        $manager->set_brands();
        $brands = $manager->get_brands();

        $review_prods = $this->get_review_prods();
        $dont_update = $this->get_noupdate_prods();
        // var_dump(count($new_products));
        // exit();

        $kaka = 0;
        echo count($new_products);
        $categories = [$this->new_products_category, $this->category, $this->review_products_category];
        $countnew = 0;
        foreach ($new_products as $key => $sku) {
            if (isset($review_prods) && !isset($review_prods['KAD - ' . $feed_products[$sku]['sku']]) && !isset($review_prods['NEWKAD - ' . $feed_products[$sku]['sku']]) && isset($dont_update) && !isset($dont_update['KAD - ' . $feed_products[$sku]['sku']]) && !isset($dont_update['NEWKAD - ' . $feed_products[$sku]['sku']])
            ) {
                $brand_name = $feed_products[$sku]['brand'];
                if (strpos($brand_name, "\"") !== false) {
                    $brand_name = explode("\"", $brand_name)[1];
                }
                // Set brand
                if ($brand_name != null) {
                    $brand_found_name = $this->brand_exists($brands, $brand_name);
                    if (!$brand_found_name) {
                        $brand_data = array(
                            "name" => $brand_name,
                            "page_title" => $brand_name . ' | Buy Organics Online',
                            "meta_keywords" => array($brand_name),
                            "search_keywords" => $brand_name,
                            "custom_url" => array(
                                "url" => "/brands/" . preg_replace(array('/( & )/', '/ +/', '/\d/', '/&/'), array("-", "", "-", "-"), $brand_name) . ".html", //str_replace(" ", "-", $brand_name) . ".html",
                                "is_customized" => false)
                        );
                        $branddata = $manager->insert_brand($brand_data);

                        if (isset($branddata['data'])) {
                            $brand_id = $branddata['data'];
                            $brands[$brand_id['name']] = $brand_id['id'];
                            $id_brand = $brand_id['id'];
                        }
                    } else {
                        $id_brand = $brands[$brand_found_name];
                    }
                }

                if (isset($id_brand)) {

                    $weight = $this->parse_weight($feed_products[$sku]['size']);

                    $data = array('name' => $feed_products[$sku]['description'],
                        //'title' => $feed_products[$sku]['description'],
                        'sku' => 'NEWKAD - ' . $feed_products[$sku]['sku'],
                        'brand_id' => $id_brand,
                        'retail_price' => $feed_products[$sku]['rrp'],
                        'price' => $feed_products[$sku]['rrp'],
                        'cost_price' => $feed_products[$sku]['wholesale'],
                        'categories' => $categories,
                        'type' => 'physical',
                        'weight' => $weight,
                        'upc' => $feed_products[$sku]['barcode'],
                        "availability" => "disabled",
                        "tax_class_id" => ($feed_products[$sku]['gst'] == 'Y' ? 0 : 1),
                        "inventory_level" => 0,
                        "inventory_tracking" => "product",
                        "is_visible" => false,
                        "images" => array(array("image_url" => "{replimg}", "is_thumbnail" => true, "sort_order" => 1, "description" => $feed_products[$sku]['description']))
                    );

                    $errstep = 0;
                    $stop = false;
                    do {
                        $encdata = json_encode($data);
                        $senddata = str_replace("{replimg}", stripcslashes($feed_products[$sku]['imageurl']), $encdata);
                        $status = $manager->insert_product(str_replace("{replimg}", stripcslashes($feed_products[$sku]['imageurl']), $encdata));
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
                    } while ($stop != true && $errstep <= 3);
                    sleep(2);
                    // var_dump($feed_products[$sku]['stockstatus']);

                    /*     if ($feed_products[$sku]['stockstatus'] == 'available') {

                      $stock_status = $this->set_stockstatus($feed_products[$sku]['stockstatus'], true);

                      $x = $data + $stock_status;
                      var_dump($x);
                      //insert new products
                      $status = $manager->insert_product($x);
                      exit();

                      if ($status->title === 'The product name is a duplicate') {
                      if ($x['sku'] != 'KAD - 471174') {
                      $x['title'] .= ' ' . $x['weight'];
                      $x['name'] .= ' ' . $x['weight'];
                      // $status = $manager->insert_product($x);

                      var_dump($x);
                      }
                      }
                      if ($status->title === 'The product sku is a duplicate') {
                      var_dump($x['sku']);
                      }
                      if ($status->title === 'Missing Required Fields') {
                      var_dump($x);
                      }
                      } */
                }
            }
        }
        echo '>> newprods>>' . $countnew;
        exit();
    }

    private function retry_by_error($status, $data, $brand_found_name, $step = 0) {
        
    }

    // Trim the string $weight in order to return the 'int' of it.

    public function parse_weight($weight) {
        $position = '';

        if (strpos($weight, 'x') !== false) {
            return 0;
        }
        if (strpos($weight, 'L') !== false) {
            $position = strpos($weight, 'L');
        }

        if (strpos($weight, 'm') !== false) {
            $position = strpos($weight, 'm');
        }

        if (strpos($weight, 'g') !== false) {
            $position = strpos($weight, 'g');
        }

        if (strpos($weight, 'k') !== false) {

            $position = strpos($weight, 'k');
        }
        if ($position == '') {
            return 0;
        }

        return (int) substr($weight, 0, $position);
    }

    // Verify what kind of status is

    public function is_status($status, $sku) {

        $product = $this->live_products[$sku];

        if (in_array($this->review_products_category, $product['categories']) || in_array($this->disabled_category, $product['categories']))
            return false;

        if ($status == 'outofstock') {
            if ($product['is_visible'] == false || $product['availability'] == 'available' /* ||  $product['is_price_hidden'] == false || $product['price_hidden_label'] != 'This product is out of stock' */) {
                return true;
            }
        }
        if ($status == 'deleted') {
            $deleted_category = 1221;
            if ($product['is_visible'] == true || !in_array($deleted_category, $product['categories']) /* ||  $product['is_price_hidden'] == false ||  $product['price_hidden_label'] != 'This product has been discontinued' */) {
                return true;
            }
        }
        if ($status == 'discontinued') {
            $deleted_category = 1221;
            if ($product['is_visible'] == true || !in_array($deleted_category, $product['categories']) /* ||  $product['is_price_hidden'] == false ||  $product['price_hidden_label'] != 'This product has been discontinued' */) {
                return true;
            }
        }
        if ($status == 'available') {
            if ($product['is_visible'] == false || $product['availability'] == 'disabled' || ($product['availability'] == 'available' && $product['inventory_level'] == 0)/* ||  $product['is_price_hidden'] == true ||  $product['price_hidden_label'] != '' */) {
                return true;
            }
        }
        return false;
    }

    public function set_stockstatus($status, $new = false) {
        if ($status == 'outofstock') {
            return $this->set_outofstock();
        }
        if ($status == 'deleted') {
            if ($new == false) {
                return $this->set_deleted();
            } else {
                return [];
            }
        }
        if ($status == 'discontinued') {
            if ($new == false) {
                return $this->set_deleted();
            } else {
                return [];
            }
        }
        if ($status == 'available') {
            return $this->set_available($new);
        }
    }

    // Set the fields for outofstock update function

    public function set_outofstock($inventory_update) {

        $fields = array(
            "is_visible" => true,
            'availability' => 'disabled',
            "price_hidden_label" => 'This product is out of stock',
            "is_price_hidden" => false
        );
        if ($inventory_update == true)
            $fields["inventory_level"] = 0;
        return $fields;
    }

    // Set the fields for deleted update function

    public function set_deleted($categories) {
        $check_before_removing_category = 1221;
        $this->attach_new_category($categories, $check_before_removing_category);
        $fields = array(
            "is_visible" => false,
            "price_hidden_label" => 'This product has been discontinued',
            "is_price_hidden" => true,
            //   "inventory_level" => 0,
            "categories" => $categories
        );
        return $fields;
    }

    // Set the fields for discontinued update function

    public function set_discontinued($categories) {
        $check_before_removing_category = 1221;
        $this->attach_new_category($categories, $check_before_removing_category);
        $fields = array(
            "is_visible" => false,
            "price_hidden_label" => 'This product has been discontinued',
            "is_price_hidden" => true,
            //   "inventory_level" => 0,
            "categories" => $categories
        );
        return $fields;
    }

    // Set the fields for available update function

    public function set_available($new, $categories, $inventory_update = false) {
        $this->unset_category($categories, 1221);
        $fields = array(
            "is_visible" => true,
            'availability' => 'available',
            "price_hidden_label" => '',
            "is_price_hidden" => false,
            "categories" => $categories
        );
        if ($inventory_update == true)
            $fields["inventory_level"] = 1000;
        if ($new === true) {
            $fields['is_visible'] = false;
            $fields['availability'] = 'disabled';
        }
        return $fields;
    }

    // Check if brand already exists on live

    public function brand_exists($brands, $brand_name) {
        $found = array_key_exists(strtoupper($brand_name), array_change_key_case($brands, CASE_UPPER));
        if (!$found) {
            return false;
        } else {
            if (isset($brands[$brand_name])) {
                return $brand_name;
            } else {
                foreach ($brands as $brname => $brid) {
                    if (strcasecmp($brname, $brand_name) === 0) {
                        return $brname;
                    }
                }
                return strtoupper($brand_name);
            }
        }
        /* if (isset($brands[$brand_name]) &&  ($brands[$brand_name] != null || $brands[strtoupper($brand_name)] != null)) {
          return true;
          } else {
          return false;
          } */
    }

    public function parse_sku($sku) {
        $without_kad_pos = 6;
        $without_ipdc_pos = strpos($sku, ' (');
        $without_dot_pos = strpos($sku, '.');

        // if($without_dot_pos !== false){
        //     return substr($sku, $without_kad_pos, $without_dot_pos - $without_kad_pos);
        // }
        if ($without_ipdc_pos === false) {
            return substr($sku, $without_kad_pos);
        } else {
            return substr($sku, $without_kad_pos, $without_ipdc_pos - $without_kad_pos);
        }
    }
 

    private function update_price($manager) {
        fwrite($this->myFile4, date("Y-m-d h:i:sa") . PHP_EOL);
        foreach ($this->products as $product_id => $product) {
            if (isset($this->live_products[$product_id])) {
                $live_product = $this->live_products[$product_id];
                if (stripos($live_product['name'], "ON SALE") == FALSE && stripos($live_product['sku'], "NEWKAD") === FALSE) {
                    $isupdated = NULL;
                    if (strval($live_product['retail_price']) != strval($product['rrp']) && $product['stockstatus'] == 'available' &&
                            (floatval($product['rrp']) > floatval($product['wholesale'])) &&
                            (floatval($live_product['price']) < floatval($product['rrp']))) {
                        $doupdprice = true;
                    } elseif (strval($live_product['cost_price']) != strval($product['wholesale']) && $product['wholesale'] != 0 && $product['stockstatus'] == 'available' && (floatval($product['RRP']) >= floatval($product['wholesale']))) {
                       /* $fieldd = array();
                        $fieldd = $this->get_gst($product_id, $fieldd);
                        if ($fieldd['tax_class_id'] == 1) {
                            $calcf = $product['Price'] * 1.1;
                            if (floatval($live_product['cost_price']) < $calcf) {
                                $doupdprice = true;
                            }
                        } else*/
                            $doupdprice = true;
                    }
                    if (isset($doupdprice) && $doupdprice === true) {
                        if ($live_product['sale_price'] != 0) {
                            $newsaleprice = floatval($product['rrp']) - (floatval($product['rrp']) * 12 / 100);
                            /*if ($live_product['sale_price'] > $newsaleprice && $newsaleprice > floatval($product['wholesale'])) {
                                $newsaleprice = $live_product['sale_price'];
                            } elseif ($live_product['sale_price'] > $newsaleprice && $live_product['sale_price'] <= $product['wholesale']) {
                                $newsaleprice = 0;
                            } elseif ($live_product['sale_price'] <= $newsaleprice && $newsaleprice <= floatval($product['wholesale'])) {
                                $newsaleprice = 0;
                            }*/
                        } else
                            $newsaleprice = 0;
                        $fields = array(
                            "retail_price" => $product['rrp'],
                            "price" => $live_product['price'] > $product['rrp'] ? $live_product['price'] : $product['rrp'],
                            "cost_price" => $product['wholesale'],
                            "calculated_price" => $product['rrp'],
                            "sale_price" => $newsaleprice
                        );
                        $fields = $this->get_gst($product_id, $fields);
                       /* if ($fields['tax_class_id'] == 1) {
                            $fields['cost_price'] = $product['wholesale'] * 1.1;
                        }*/
                        if ($newsaleprice <= $fields['cost_price']) {
                            $fields['sale_price'] = 0;
                        }
                      /*  if ($live_product['cost_price'] > $fields['cost_price']) {
                            $fields["cost_price"] = $live_product['cost_price'];
                        }*/
                        fwrite($this->myFile4, $live_product["sku"] . "," . $live_product['price'] . "," . $fields['price'] . "," . $live_product['retail_price'] . "," . $fields['retail_price']
                                . "," . $live_product['cost_price'] . "," . $fields['cost_price'] . "," . $live_product['sale_price'] . "," . $fields['sale_price'] . PHP_EOL);

                        $manager->update_product($fields, $live_product['id']);
                        $isupdated = true;
                    } elseif (strval($live_product['retail_price']) != strval($product['rrp']) && $product['stockstatus'] == 'available' && (floatval($product['rrp']) <= floatval($product['wholesale'])) /* &&
                      (floatval($live_product['price']) < floatval($product['rrp'])) */) {
                        fwrite($this->myFile3, $live_product["sku"] . PHP_EOL);
                    }
                    if (!isset($isupdated) && strval($live_product['cost_price']) != strval($product['wholesale']) && $product['wholesale'] != 0){
                        $fields = array(
                            "cost_price" => $product['wholesale']
                        );
                        $manager->update_product($fields, $live_product['id']);
                    }
                }
            }
        }
    }

    // Update products
    private function get_product_inventory_update($prodid, $toactive = NULL) {
        foreach ($this->live_products as $kid => $live_product) {
            if ($live_product['id'] == $prodid) {
                if ($live_product['inventory_level'] <= 300 && $live_product['inventory_level'] > 0) {
                    return false;
                } elseif (stripos($live_product['name'], "ON SALE") !== FALSE && $live_product['inventory_level'] == 0) {
                    return false;
                } else
                    return true;
                /* if ($live_product['id'] == $prodid) {
                  if ($live_product['inventory_tracking'] == "none"
                  || (isset($toactive) && $live_product['inventory_level'] == 0 && $live_product['inventory_tracking'] == "product" && stripos($prod['name'], "ON SALE") === FALSE)) {
                  return true;
                  } */
            }
        }
        return false;
    }

    private function can_be_updated($prodid, $toactive = NULL) {
        foreach ($this->live_products as $kid => $live_product) {
            if ($live_product['id'] == $prodid) {
                if ($live_product['inventory_level'] <= 300 && $live_product['inventory_level'] > 0) {
                    return false;
                } elseif (isset($toactive) && stripos($live_product['name'], "ON SALE") !== FALSE && $live_product['inventory_level'] == 0 && $live_product['inventory_tracking'] == "none") {
                    return false;
                } else
                    return true;
            }
            /*  if ($live_product['id'] == $prodid && $live_product['inventory_tracking'] == "product" && $live_product['inventory_level'] > 0) {
              return false;
              } */
        }
        return true;
    }

    public function update() {
        $manager = new Api_manager();
        $this->update_outofstock($manager);
        $this->update_deleted($manager);
        $this->update_discontinued($manager);
        $this->update_available($manager); //    --- need to uncomment when changes done on store ready 
        $this->update_price($manager);
        // Close the writing file
        fclose($this->myFile);
    }

    private function writeToOutofStockCSV($sku, $id, $status) {
        file_put_contents($this->myFileoutofstock, $sku . "," . $id . "," . $status . PHP_EOL, FILE_APPEND);
    }

    // Update as out of stock products that changed their status as out of stock on CSV
    private function get_gst($sku, $fields) {
        if (isset($this->products[$sku]) && isset($this->products[$sku]['gst'])) {
            $fields['tax_class_id'] = $this->products[$sku]['gst'] == 'Y' ? 0 : 1;
        }
        return $fields;
    }

    public function update_outofstock($manager) {
        $products = array();
        if (isset($this->changed_products['outofstock'])) {
            $products = $this->changed_products['outofstock'];

            foreach ($products as $sku => $id) {
                if ($this->can_be_updated($id)) {
                    $inv_update = $this->get_product_inventory_update($id);
                    $fields = $this->set_outofstock($inv_update);
                    // var_dump($id);
                    //updata api_manager
                    $fields = $this->get_gst($sku, $fields);
                    $this->writeToOutofStockCSV($sku, $id, "set outofstock");
                    echo "<br> - kadac update_outofstock " . $id;
                    $manager->update_product($fields, $id);
                } else {
                    echo "should set out of stock " . $id . " ";
                }
                // exit();
            }
        }
        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($products) . " out of stock products have been changed.\n";
        fwrite($this->myFile, $txt);
    }

    // Update as deleted products that changed their status as deleted on CSV

    public function update_deleted($manager) {
        $products = array();
        if (isset($this->changed_products['deleted'])) {
            $products = $this->changed_products['deleted'];

            foreach ($products as $sku => $id) {
                if ($this->can_be_updated($id)) {
                    $categories = $this->live_products[$sku]['categories'];

                    $fields = $this->set_deleted($categories);
                    // var_dump($id);
                    //update api_manager
                    $this->writeToOutofStockCSV($sku, $id, "set deleted");
                    echo "<br> - kadac update_deleted " . $id;
                    $manager->update_product($fields, $id);
                }
                // exit();
            }
        }
        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($products) . " deleted products have been changed.\n";
        fwrite($this->myFile, $txt);
    }

    // Update as discontinued products that changed their status as discontinued on CSV

    public function update_discontinued($manager) {
        $products = array();
        if (isset($this->changed_products['discontinued'])) {
            $products = $this->changed_products['discontinued'];

            foreach ($products as $sku => $id) {
                if ($this->can_be_updated($id)) {
                    $categories = $this->live_products[$sku]['categories'];

                    $fields = $this->set_discontinued($categories);

                    // var_dump($id);
                    //updata api_manager
                    $this->writeToOutofStockCSV($sku, $id, "set discontinued");
                    echo "<br> - kadac update_discontinued " . $id;
                    $manager->update_product($fields, $id);
                } else {
                    echo "should set update_discontinued " . $id . " ";
                }
                // exit();
            }
        }

        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($products) . " discontinued products have been changed.\n";
        fwrite($this->myFile, $txt);
    }

    // Update as available products that changed their status as available on CSV

    public function update_available($manager) {
        $products = array();
        if (isset($this->changed_products['available'])) {
            $products = $this->changed_products['available'];

            foreach ($products as $sku => $id) {
                if ($this->can_be_updated($id, true)) {
                    $inv_update = $this->get_product_inventory_update($id, true);
                    $categories = $this->live_products[$sku]['categories'];
                    echo "<br> - kadac update_available " . $id;
                    $fields = $this->set_available(false, $categories, $inv_update);
                    // var_dump($id);
                    //updata api_manager
                    $fields = $this->get_gst($sku, $fields);
                    $manager->update_product($fields, $id);
                } else {
                    echo "should set available " . $id . " ";
                }
                // exit();
            }
        }
        // Log

        $txt = "[" . date("Y-m-d h:i:sa") . "] [Kadac] " . count($products) . " available products have been changed.\n";



        fwrite($this->myFile, $txt);
    }

    public function get_bulk_products($manager = NULL, $page = 1, $step = 1) {

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

            if (isset($this->live_products[$sku]) && ((strpos($this->live_products[$sku]['sku'], 'KAD') !== FALSE && strpos($this->live_products[$sku]['sku'], 'KAD') >= 0 && strpos($this->live_products[$sku]['sku'], 'KAD') < 3) ||
                    (strpos($this->live_products[$sku]['sku'], 'NEWKAD') !== FALSE && strpos($this->live_products[$sku]['sku'], 'NEWKAD') >= 0 && strpos($this->live_products[$sku]['sku'], 'NEWKAD') < 3))
            /* && !in_array($this->category, $this->live_products[$sku]['categories']) && !in_array($this->review_products_category, $this->live_products[$sku]['categories']) */) {
                $skucc = explode("-", $sku);
                array_shift($skucc);
                $skuop = implode($skucc);
                $skuop = trim($skuop);
                // $this->live_products[$sku]['categories'][] = $this->review_products_category;
                //     $manager->update_product(array("categories" => $this->live_products[$sku]['categories']), $this->live_products[$sku]['id']);
                //   echo $sku . " - " . json_encode($this->live_products[$sku]['categories']);

                if (strlen($skuop) > 1 && !isset($this->products[$skuop]) && !in_array('1221', $this->live_products[$sku]['categories']) && $this->live_products[$sku]['is_visible'] == "true" && $this->live_products[$sku]['availability'] == "available") {
                    echo $skuop . ',' . $this->live_products[$sku]['sku'] . PHP_EOL;
                    //$this->live_products[$sku]['categories'][] = 1689;
                    // $manager->update_product(array("categories" => $this->live_products[$sku]['categories'], "bin_picking_number"=>"notfound", "availability"=>"disabled"), $this->live_products[$sku]['id']);
                    fwrite($this->myFile2, $skuop . ',' . $this->live_products[$sku]['sku'] . PHP_EOL);
                }
                // $manager->update_product(array("is_price_hidden" => false), $live_product['id']);
            }
        }
        /* $this->changed_products = array();
          $this->set_changed_products($active_products);
          $this->update_outofstock($manager);
          $this->update_discontinued($manager);
          $this->update_available($manager);
         */
        echo $page + $no_pages . PHP_EOL;
        if (($page + $no_pages) <= $manager->get_total_pages()) {
            $step += 1;
            $do = $this->get_bulk_products($manager, $page + $no_pages, $step);
        }/* else {
          //read all pages from BC, will see if there are new products
          $this->check_new_products($manager->get_sku_all_prods());
          } */
    }

}
