<?php

use Bigcommerce\Api\Client as Bigcommerce;

include_once 'Supplier.php';

include_once 'Api_manager.php';

require 'vendor/autoload.php';

require 'config/database.php';
require 'vendor/PHPMailer/class.smtp.php';
require 'vendor/PHPMailer/class.phpmailer.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

class Oborne implements Supplier {

    private $name;
    private $url;
    private $products;
    private $myFile;
    private $myFile2;
    private $changed_products = array();
    private $live_products;
    private $new_products;
    private $category = 1346;  //1346
    private $new_products_category = 1219;
    private $review_products_category = 1686;  // oborne review
    private $disabled_category = 1705;

    public function __construct($name, $url) {
        echo '<br><br>start Oborne ' . date("Y-m-d h:i:sa") . '<br>';
        // update the Oborne file
        $this->email();
        $this->name = $name;
        $this->url = $url;
        $this->myFile = fopen("update_activity.txt", "a") or die("Unable to open file!");
        //  $this->myFile2 = fopen("OB_prods_notupdating.csv", "a") or die("Unable to open file!");

        $this->myFile3 = fopen("/var/www/bigcupdate.fyic.com.au/web/OB_prods_price.csv", "a") or die("Unable to open file!");
        $this->myFile4 = fopen("/var/www/bigcupdate.fyic.com.au/web/OB_check_price.log", "a") or die("Unable to open file!");
        $this->myFileoutofstock = "/var/www/bigcupdate.fyic.com.au/web/prods_outofstock.csv";
        if (file_exists($this->myFileoutofstock) === true) {
            file_put_contents($this->myFileoutofstock, 'Oborne ' . date("Y-m-d h:i:sa") . PHP_EOL, FILE_APPEND);
        } else {
            file_put_contents($this->myFileoutofstock, 'Oborne ' . date("Y-m-d h:i:sa") . PHP_EOL);
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

    public function get_live_products() {

        return $this->live_products;
    }

    public function testText(){
        echo "testText()";
    }

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

    /* public function get_skus_fromcsv() {
      $handle = fopen('notfound.csv', "r");
      $s = array();
      $row = 1;
      if ($handle !== FALSE) {
      while (($val = fgetcsv($handle, 0, ",")) !== FALSE) {
      $s[] = $val[0];
      }
      fclose($handle);
      }
      if (!empty($s)) {
      return $s;
      }
      return false;
      } */

    public function get_categs_notfound() {
        /* $categsn = array();
          $notinbigc = array();
          $skus = $this->get_skus_fromcsv();

          $manager = new Api_manager();
          $step = 0;
          foreach ($skus as $sku) {

          $resp = $manager->get_products_by_sku(1, $sku);
          if ($resp == '0') {
          $notinbigc[] = $sku;
          } else {
          foreach ($resp as $value) {
          if (!in_array($value, $categsn, true)) {
          array_push($categsn, $value);
          }
          }
          }
          $step++;
          if ($step == 50) {
          file_put_contents('tocheckOborne.txt', implode(",", $categsn), FILE_APPEND | LOCK_EX);
          file_put_contents('notfountBigcOborne.txt', implode(",", $notinbigc), FILE_APPEND | LOCK_EX);
          $step=0;
          }
          } */
    }

    public function get_big_commerce_products($file) {
        $boo_products = file_get_contents('http://buyorganicsonline.dev.nextlogic.ro/storage/' . $file . '.json');
        return json_decode($boo_products);
    }

    public function filter_oborne_from_live_products() {

        $bc_products = $this->get_big_commerce_products('boo_file');
        $oborne_products = array();
        foreach ($bc_products as $id => $product) {
            if (strpos($product->sku, 'OB - ') === 0) {
                $oborne_products[$id] = ['sku' => $product->sku,
                    'categories' => $product->categories];
            }
        }
        return $oborne_products;
    }

    public function test_products_feed() {

        $feed = file_get_contents($this->url);

        print_r("URL (OBORNE):==(");

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
            print_r("OB(");
            print_r($products_feed[$key][1]);
            print_r("___");
            print_r($products_feed[$key][3]);
            print_r("(cost_price)___");
            print_r($products_feed[$key][4]);
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
                    $s[$csvdata[$columns[1]]] = $csvdata;
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
        $skucode = trim(explode("OB -", $sku)[1]);
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
                    if ($csvdata[$columns[1]] == $skucode) {
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

    public function attach_new_category(&$categories, $new_category) {
        $categories[] = $new_category;
    }

    // Remove category from existing categories of a product

    public function unset_category(&$categories, $to_be_unset_category) {
        $key = array_search($to_be_unset_category, $categories);
        if ($key !== false) {
            unset($categories[$key]);
        }
    }

    public function insert_oborne_in_category() {
        $manager = new Api_manager();
        $products = $this->filter_oborne_from_live_products();
        $count = 1000;
        foreach ($products as $id => $product) {
            if ($count > 0 && $id > 18492) {
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

    public function check_swim($live_product, $csvprod) {
        $manager = new Api_manager();
        if ($live_product) {
            try {
                //bin_picking_number
                //    $manager->update_product(array("bin_picking_number" => "yes"), $live_product['id']);
                //  if ($live_product['is_visible'] == true && $live_product["availability"] == "available" && $live_product["inventory_level"] > 50  && $live_product["inventory_level"] < 1000) {
                // if ($live_product["inventory_tracking"] == "product" && $live_product["availability"] == "disabled" && $live_product["inventory_level"] != 0) {
                //        $manager->update_product(array("inventory_level" => "1000"), $live_product['id']);
                //    fwrite($this->myFile2, $live_product["id"] . ',' . $live_product["sku"] . ',' . $live_product["name"] . ',' . $live_product["inventory_level"] . ',' . $live_product["inventory_tracking"] . ',' . $live_product["availability"] . PHP_EOL);
                //  $live_product["id"].','. $live_product["sku"].','. $live_product["name"].','. $live_product["price"].','. $live_product["sale_price"].','. $live_product["retail_price"].','. $live_product["cost_price"]
                // .','. $csvprod["W/S ex gst"].','. $csvprod["RRP"] .','. $csvprod["GST Status"]. PHP_EOL);
                //   }
                // }   //W/S ex gst,RRP,GST Status
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

    private function check_new_products($live_all_products) {
        $this->new_products = array();
        foreach ($this->products as $sku => $value) {
            if (!isset($live_all_products[$sku]) && ($value['RRP'] > $value['W/S ex gst'] || ($value['RRP'] == 0 && $value['W/S ex gst'] > 0))) {
                if (($value['Availability'] == 'In Stock' || $value['Availability'] == 'Out of Stock') && $value['To Be Discontinued'] == "No" && $value['W/S ex gst'] != 0) {
                    $this->new_products[] = $sku;
                    echo $sku . " <br>". PHP_EOL;
                }
            }
        }
        //if (isset($this->new_products) && count($this->new_products) > 0) {
        //    $this->insert_new_products_on_live();
       // }
    }

    public function todelnewob() {
        $page = 1;
        $manager = new Api_manager();
        if (!isset($this->tocheck)) {
            $this->tocheck = [];
            $this->allprods = [];
        }

        $params = "?keyword=OB%20-&keyword_context=sku&limit=50";
        $mdata = $manager->get_product_by_variant($params);
        //  if (isset($mdata) && $mdata != '0') {
        // foreach ($mdata as $key => $rp) {
        //    $manager->delete_product($rp['id']);
        //     echo $rp['id'] . ',';
        // }
        //      }
        if (isset($mdata) && $mdata != '0') {
            $resp_data = $mdata;
            $flag = 'true';

            do {
                $page += 1;
                $params = "?keyword=OB%20-&keyword_context=sku&page={$page}&limit=50";
                $mdata = $manager->get_product_by_variant($params);

                if (isset($mdata) && $mdata != '0') {
                    // foreach ($mdata as $key => $rp) {
                    //    $manager->delete_product($rp['id']);
                    //  echo $rp['id'] . ',';
                    //  }
                    $resp_data = array_merge($resp_data, $mdata);
                } else {
                    echo $page;
                    $flag = 'false';
                }
            } while ($flag == 'true');
        }
        foreach ($resp_data as $sku => $rp) {
            $categories = $rp['categories'];
            if (!in_array(1221, $categories) && !in_array(1346, $categories)) {
                if (in_array(1686, $categories))
                    echo 'review categ - ' . $rp['sku'] . "<br>" . PHP_EOL;
                elseif (in_array(1219, $categories))
                    echo 'new categ - ' . $rp['sku'] . "<br>" . PHP_EOL;
                elseif (in_array(1705, $categories))
                    echo 'disabled categ - ' . $rp['sku'] . "<br>" . PHP_EOL;
                else
                    echo $rp['sku'] . "<br>" . PHP_EOL;
            }
            /* $mm = explode(" - ", trim($value['sku']));
              $mixedsku = explode(" : ", trim($value['sku']));
              if (strpos($value['sku'], 'NEWOB') !== false && strpos($value['sku'], 'Mixed Special') !== false) {
              $this->tocheck[] = array("sku" => $mixedsku[1], "id" => $value["id"], "visible" => $value["is_visible"], 'sku_val' => $value['sku']);
              }
              if (strpos($value['sku'], 'NEWOB') === false && strpos($value['sku'], 'OB') !== false) {
              $this->allprods[$mm[1]] = array("sku" => $value['sku']);
              } */
        }

        echo json_encode($this->tocheck);
        //echo json_encode($this->allprods). "<br><br>-----------<br>";

        foreach ($this->tocheck as $tc) {
            if (isset($this->allprods[$tc['sku']])) {
                echo $tc['id'] . ',';
                // echo $this->allprods[$tc['sku']]['sku'] ." -- ".$tc['sku_val'].'<br>'. PHP_EOL;
            }
        }
        /* $page = 1;
          $params = "?keyword=UN%20&keyword_context=sku&page={$page}&limit=50";
          $mdata = $manager->get_product_by_variant($params);
          if (isset($mdata) && $mdata != '0') {
          $resp_data = $mdata;
          $flag = 'true';

          do {
          $page += 1;
          $params = "?keyword=UN%20&keyword_context=sku&page={$page}&limit=50";
          $mdata = $manager->get_product_by_variant($params);

          if (isset($mdata) && $mdata != '0') {
          $resp_data = array_merge($resp_data, $mdata);
          } else {
          echo $page;
          $flag = 'false';
          }
          } while ($flag == 'true');
          }
          if (isset($resp_data)) {
          //   $ldata = array();
          foreach ($resp_data as $key => $rp) {

          $categories = $rp['categories'];
          if (!in_array(1221, $categories) && !in_array(1345, $categories)) {
          if (in_array(1687, $categories))
          echo 'review categ - ' . $rp['sku'] . "<br>" . PHP_EOL;
          elseif (in_array(1218, $categories))
          echo 'new categ - ' . $rp['sku'] . "<br>" . PHP_EOL;
          elseif (in_array(1705, $categories))
          echo 'disabled categ - ' . $rp['sku'] . "<br>" . PHP_EOL;
          else
          echo $rp['sku'] . "<br>" . PHP_EOL;
          //   fwrite($this->myFile5, $rp['sku'] . "," . $rp['is_visible'] . PHP_EOL);
          // if (!isset($this->products[$sku])) {
          //    if(isset($this->products[trim($sku)])) fwrite($this->myFile5, "--remove spaces-". $this->live_products[$sku]['sku'] .",".$this->live_products[$sku]['is_visible']. PHP_EOL);
          // }
          }
          // $ldata[$sku] = $rp;
          }
          $resp_data = NULL;
          } */
    }

    public function update_price1($manager) {
        // $count = 0;
        //  fwrite($this->myFile3, date("Y-m-d h:i:sa") . PHP_EOL);
        foreach ($this->products as $product_id => $product) {
            if (isset($this->live_products[$product_id])) {
                $live_product = $this->live_products[$product_id];
                if (stripos($live_product['name'], "ON SALE") == FALSE && stripos($live_product['sku'], "NEWOB") === FALSE) {
                    if (strval($live_product['cost_price']) != strval($product['W/S ex gst']) && is_numeric($product['W/S ex gst']) && $product['W/S ex gst']!=0) {
                        $fields = array(
                            "cost_price" => $product['W/S ex gst']
                        );
                        $manager->update_product($fields, $live_product['id']);
                    }
                }
            }
        }
    }

    public function do_bulk_update1($manager = NULL, $page = 1, $step = 1) {
        if (!$manager) {
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
            $do = $this->do_bulk_update1($manager, $page + $no_pages, $step);
        }
    }

    public function do_bulk_update($manager = NULL, $page = 1, $step = 1) {
        if (!$manager) {
            $manager = new Api_manager();
        } else {
            $manager->reset_prods();
        }
        $no_pages = 20;
        $rm = $manager->set_products($page, $this->category, false, false, $no_pages * $step);

        $this->live_products = $manager->get_products();

        $active_products = array();
        foreach ($this->products as $sku => $value) {
            if (isset($this->live_products[$sku]) && $this->live_products[$sku]['sku'] != 'NEWOB - ' . $sku) {
                $active_products[$sku] = $value;
                //  echo $sku. ',';
            }
        }

        if (!isset($this->discontinued))
            $this->discontinued = array();


//       foreach ($this->live_products as $sku => $livep) {
//            if (!isset($this->products[$sku])) {
//                $continue = true;
//                if (isset($this->products[trim($sku)])) {
//                    echo 'remove spaces ' . $livep['sku'] . "<br>" . PHP_EOL;
//                } elseif(strpos($this->live_products[$sku]['sku'], 'ZZ Mixed') !== false){
//                    echo "               >>>>" . $this->live_products[$sku]['sku'] . "<br>" . PHP_EOL;
//                    $skulkey = explode(" : ", $this->live_products[$sku]['sku']);
//                    if(isset($this->products[$skulkey[1]])){
//                        $continue = false;
//                    }
//                }else {
//                    foreach($this->products as $skp => $cprod){
//                        if(strpos($cprod['Name'], 'ZZ Mixed') !== false){
//                            $skukey = explode(" : ", $cprod['Name']);
//                            if($skukey[1] == $sku){$continue = false;break;}
//                        }
//                    }
//                }
//                //   $this->live_products[$sku]['sku'] = str_replace("\"", "", $this->live_products[$sku]['sku']);
//            if ($continue === true && !preg_match("/[&\(]/i", $this->live_products[$sku]['sku']) /* && strpos($this->live_products[$sku]['sku'], 'B -') > 0 */) {
//                if ($this->live_products[$sku]['inventory_level'] > 300 || $this->live_products[$sku]['inventory_level'] == 0) {
//                    $categories = $this->live_products[$sku]['categories'];
//                    if (!in_array(1221, $categories) && $this->live_products[$sku]['is_visible'] == true && strpos($this->live_products[$sku]['sku'], 'OB') !== false) {
//                        //    echo $livep['sku'] . ($this->live_products[$sku]['is_visible'] == true ? "  visible" : "") . "<br>" . PHP_EOL;
//                        if (strpos($this->live_products[$sku]['sku'], 'OLD') === false) {
//                            if (!$this->is_mixed_prod($sku)) {
//                                $fields = $this->set_discontinued($categories);
//                                $manager->update_product($fields, $this->live_products[$sku]['id']);
//                                $this->writeToOutofStockCSV($this->live_products[$sku]['sku'], $this->live_products[$sku]['id'], "set discontinued");
//                            }
//                        }
//                    }
//                }
//            }
////            }
//        }
        $this->changed_products = array();
        $this->set_changed_products($active_products);
        $this->update_outofstock($manager);
        $this->update_discontinued($manager);
        $this->update_available($manager);
        $this->update_price($manager);

        if (($page + $no_pages) <= $manager->get_total_pages()) {
            $step += 1;
            $do = $this->do_bulk_update($manager, $page + $no_pages, $step);
        } else {
            $this->sendReport();
            //read all pages from BC, will see if there are new products
             //  $this->check_new_products($manager->get_sku_all_prods());
        }
    }

    private function is_mixed_prod($sku) {
        if (strpos($this->live_products[$sku]['sku'], 'Mixed') === false) {
            $pattern = "/((\:)(\s)" . $sku . ")$/i";
            foreach ($this->products as $kp => $prds) {
                if (strpos($kp, 'Mixed') !== false) {
                    preg_match_all($pattern, $kp, $result);
                    if (isset($result) && isset($result[0]) && isset($result[0][0]) && $result[0][0]) {
                        $dd = explode(":", $result[0][0]);
                        if (isset($dd[1]) && trim($dd[1]) == $sku) {
                            return true;
                        }
                    }
                }
            }
        } else {
            return true;
        }
        return false;
    }

    private function isBetween($from, $till, $input) {
        $f = DateTime::createFromFormat('!H:i', $from);
        $t = DateTime::createFromFormat('!H:i', $till);
        $i = DateTime::createFromFormat('!H:i', $input);
        if ($f > $t)
            $t->modify('+1 day');
        return ($f <= $i && $i <= $t) || ($f <= $i->modify('+1 day') && $i <= $t);
    }

    public function sendReport() {
        $var = date('H:i');
        if ($this->isBetween("17:00", "18:00", $var) == true) {
            $fname = "prods_outofstock_" . date("Y-m-d") . ".csv";
            $newname = "/var/www/bigcupdate.fyic.com.au/web/" . $fname;
            rename($this->myFileoutofstock, $newname);
            $this->sendMail($newname, $fname);
        };
    }

    public function set_changed_and_new_products() {
        /*    $manager = new Api_manager();
          //  $category_query_array = array($this->category, "514", "515", "1144", "979", "1236", "983", "1099", "414", "31", "416", "493", "625", "741", "1345","1575", "1576", "498");
          $manager->set_products(1, $this->category, false, 1219);
          $this->live_products = $manager->get_products();
          $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($this->live_products) . " products on live (Oborne category).\n";
          fwrite($this->myFile, $txt);
          $active_products = array();
          $new = array();
          foreach ($this->products as $sku => $value) {
          //new products
          if (!isset($this->live_products[$sku]) && !isset($this->live_products['NEWOB - ' . $sku])) {
          if (($value['Availability'] == 'In Stock' || $value['Availability'] == 'Out of Stock') && $value['To Be Discontinued'] == "No") {
          //      $new[] = $sku;
          }
          } else {
          if ($this->live_products[$sku] && $this->live_products[$sku]['sku'] != 'NEWOB - ' . $sku) {
          //       $this->check_swim($this->live_products[$sku], $value);
          $active_products[$sku] = $value;
          }
          }
          }

          // Log
          $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($new) . " new products which are in CSV, but not on live.\n";
          fwrite($this->myFile, $txt);

          $this->set_changed_products($active_products);
         */
        /*    $this->new_products = $new;
          echo " -- ". count($new);
          $this->insert_new_products_on_live(); */
    }

    private function brand_exists($brands, $brand_name) {
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
        $categories = [$this->new_products_category, $this->category, $this->review_products_category];
        $countnew = 0;
        foreach ($new_products as $key => $sku) {
            if (isset($review_prods) && !isset($review_prods['OB - ' . $feed_products[$sku]['Name']]) && !isset($review_prods['NEWOB - ' . $feed_products[$sku]['Name']]) && (isset($dont_update) && !isset($dont_update['OB - ' . $feed_products[$sku]['Name']]) && !isset($dont_update['NEWOB - ' . $feed_products[$sku]['Name']]))
            ) {
                $brand_name = $feed_products[$sku]['Brand'];
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
                            echo "added brand_id " . $id_brand . PHP_EOL;
                        }
                    } else {
                        $id_brand = $brands[$brand_found_name];
                    }
                }

                if (isset($id_brand)) {
                    //$weight = $this->parse_weight($feed_products[$sku]['size']);
                    $data = array('name' => $feed_products[$sku]['Display Name'],
                        //'title' => $feed_products[$sku]['description'],
                        'sku' => 'NEWOB - ' . $feed_products[$sku]['Name'],
                        'brand_id' => $id_brand,
                        'retail_price' => $feed_products[$sku]['RRP'],
                        'price' => $feed_products[$sku]['RRP'],
                        'cost_price' => $feed_products[$sku]['W/S ex gst'],
                        'categories' => $categories,
                        'type' => 'physical',
                        'weight' => 1,
                        'upc' => $feed_products[$sku]['Barcode'],
                        "availability" => "disabled",
                        "inventory_level" => 0,
                        "inventory_tracking" => "product",
                        "tax_class_id" => ($feed_products[$sku][$sku]['GST Status'] == 'GST applies' ? 0 : 1),
                        "is_visible" => false
                    );

                    $errstep = 0;
                    $stop = false;
                    do {
                        $encdata = json_encode($data);

                        $status = $manager->insert_product($encdata);
                        if (isset($status) && !isset($status['errors'])) {
                            $countnew += 1;
                            $stop = true;
                            echo "new OB - " . $data['sku'];
                        } else {
                            if ($status['title'] === 'The product name is a duplicate') {
                                if ($errstep > 0) {
                                    $data['name'] .= ' 2';
                                } else
                                    $data['name'] .= " - " . $brand_found_name;

                                if ($errstep == 2) {
                                    $txt = "[" . date("Y-m-d h:i:sa") . "] [OB]  error adding new prod " . $data['sku'] . ".\n";
                                    fwrite($this->myFile, $txt);
                                }
                                $errstep += 1;
                            } else {
                                $stop = true;
                                $txt = "[" . date("Y-m-d h:i:sa") . "] [OB]  error adding new prod " . $data['sku'] . ".\n";
                                fwrite($this->myFile, $txt);
                            }
                        }
                    } while ($stop != true && $errstep < 3);
                    sleep(2);
                }
            }
        }
        echo '>> newprods>>' . $countnew;
        exit();
    }

    public function set_changed_products($active_products) {

        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($active_products) . " active products from CSV.\n";

        fwrite($this->myFile, $txt);

        foreach ($active_products as $sku => $value) {
            $status1 = $value['Availability'];
            $status2 = $value['To Be Discontinued'];
            //  file_put_contents('OB_IN_STOCK.txt',$status1.' - '.$status2.' - '.json_encode($this->live_products[$sku]), FILE_APPEND);
            if ($this->is_status($status1, $status2, $sku) == true) { //1413 , sku: OB - MCMOSP
                $this->changed_products[$status1][$status2][$sku] = $this->live_products[$sku]['id'];
            }
        }
        // file_put_contents('OB_IN_STOCK.txt',json_encode($this->changed_products), FILE_APPEND);
        // print_r($this->changed_products);
    }

    public function is_status($status1, $status2, $sku) {
        $product = json_decode(json_encode($this->live_products[$sku]), true);
        // This function will take only the products which have a description, meaning that the product is listed (products which do not have description are not listed and also are not ready to be displayed)
        if (in_array($this->review_products_category, $product['categories']) || in_array($this->disabled_category, $product['categories']))
            return false;

        if (isset($product['name']) && isset($product['description']) && (strlen($product['description']) > strlen($product['name']))) {
            if ($status1 == 'Out of Stock') {
                if ($status2 == 'Yes') {
                    $deleted_category = 1221;
                    if ($product['is_visible'] == true || !in_array($deleted_category, $product['categories']) /* || $product['is_price_hidden'] == false  || $product['price_hidden_label'] != 'This product has been discontinued' */) {
                        return true;
                    }
                } else {
                    if ($product['is_visible'] == false || $product['availability'] == 'available' /* ||  $product['is_price_hidden'] == false ||  $product['price_hidden_label'] != 'This product is out of stock' */) {
                        return true;
                    }
                }
            }
            if ($status1 == 'In Stock') {
                $new_oborne_category = 1219;
                if (($product['is_visible'] == false || $product['availability'] == 'disabled' || ($product['availability'] == 'available' && $product['inventory_level'] == 0)
                        /* ||  $product['is_price_hidden'] == true || $product['price_hidden_label'] != '' */) /* && !in_array($new_oborne_category, $product['categories']) */) {
                    return true;
                }
            }
        }
        /* else {

          if (isset($product['description']) && isset($product['is_visible']) && strlen($product['description']) == 0 && $product['is_visible'] == true) {
          if (!isset($this->changed_products['hide']))
          $this->changed_products['hide'] = array();
          $this->changed_products['hide'][] = $this->live_products[$sku]['id'];
          }
          } */

        return false;
    }

    public function parse_sku($sku) {
        // var_dump($sku);
        $without_kad_pos = 5;
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

    // Set the fields for outofstock update function
    public function set_hidden() {
        $fields = array(
            "is_visible" => false,
            "inventory_level" => 0
        );
        return $fields;
    }

    private function writeToOutofStockCSV($sku, $id, $status) {
        file_put_contents($this->myFileoutofstock, $sku . "," . $id . "," . $status . PHP_EOL, FILE_APPEND);
    }

    public function set_outofstock($inventory_update) {
        // $this->unset_category($categories, 1221);
        $fields = array(
            "is_visible" => true,
            'availability' => 'disabled',
            "price_hidden_label" => 'This product is out of stock',
            "is_price_hidden" => false//,
                //   "categories" => $categories
        );
        if ($inventory_update == true)
            $fields["inventory_level"] = 0;
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
            "categories" => $categories
        );
        return $fields;
    }

    // Set the fields for available update function

    public function set_available($new, $categories, $inventory_update) {
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

    public function update_price($manager) {
        // $count = 0;
        fwrite($this->myFile3, date("Y-m-d h:i:sa") . PHP_EOL);
        foreach ($this->products as $product_id => $product) {
            if (isset($this->live_products[$product_id])) {
                $live_product = $this->live_products[$product_id];
                if (stripos($live_product['name'], "on sale") == FALSE && stripos($live_product['sku'], "NEWOB") === FALSE) {
                    $isupdated = NULL;
                    if (strval($live_product['retail_price']) != strval($product['RRP']) && $product['Availability'] == 'In Stock' && (floatval($product['RRP']) > floatval($product['W/S ex gst'])) &&
                            (floatval($live_product['price']) < floatval($product['RRP']))) {
                        $doupdprice = true;
                    } elseif (strval($live_product['cost_price']) != strval($product['W/S ex gst'])  && $product['W/S ex gst'] != 0 && $product['Availability'] == 'In Stock' && (floatval($product['RRP']) > floatval($product['W/S ex gst']))) {
                        $fieldd = array();
                      
                            $doupdprice = true;
                    }
                    if (isset($doupdprice) && $doupdprice === true) {
                        if ($live_product['sale_price'] != 0) {
                            $newsaleprice = floatval($product['RRP']) - (floatval($product['RRP']) * 8 / 100);
                           /* if ($live_product['sale_price'] > $newsaleprice && $newsaleprice > floatval($product['W/S ex gst'])) {
                                $newsaleprice = $live_product['sale_price'];
                            } elseif ($live_product['sale_price'] > $newsaleprice && $live_product['sale_price'] <= $product['W/S ex gst']) {
                                $newsaleprice = 0;
                            } elseif (/*$live_product['sale_price'] <= $newsaleprice && $newsaleprice < floatval($product['W/S ex gst'])) {
                                $newsaleprice = 0;
                            }*/
                        } else
                            $newsaleprice = 0;
                        $fields = array(
                            "retail_price" => $product['RRP'],
                            "price" => $live_product['price'] > $product['RRP'] ? $live_product['price'] : $product['RRP'],
                            "cost_price" => $product['W/S ex gst'],
                            "calculated_price" => $product['RRP'],
                            "sale_price" => $newsaleprice
                        );
                        $fields = $this->get_gst($product_id, $fields);
                        /*if ($fields['tax_class_id'] == 1) {
                            $fields['cost_price'] = $product['W/S ex gst'] * 1.1;
                        }*/
                        if ($newsaleprice < $fields['cost_price']) {
                            $fields['sale_price'] = 0;
                        }
                       /* if ($live_product['cost_price'] > $fields['cost_price']) {
                            $fields["cost_price"] = $live_product['cost_price'];
                        }*/
                        fwrite($this->myFile3, $live_product["sku"] . "," . $live_product['price'] . "," . $fields['price'] . "," . $live_product['retail_price'] . "," . $fields['retail_price']
                                . "," . $live_product['cost_price'] . "," . $fields['cost_price'] . "," . $live_product['sale_price'] . "," . $fields['sale_price'] . PHP_EOL);
                        $manager->update_product($fields, $live_product['id']);
                        $isupdated = true;
                    } elseif (strval($live_product['retail_price']) != strval($product['RRP']) && $product['Availability'] == 'In Stock' && (floatval($product['RRP']) <= floatval($product['W/S ex gst'])) //&&
                    /* (floatval($live_product['price']) < floatval($product['RRP'])) */) {
                        fwrite($this->myFile4, $live_product["sku"] . PHP_EOL);
                    } 
                    if (!isset($isupdated) && strval($live_product['cost_price']) != strval($product['W/S ex gst']) && $product['W/S ex gst'] != 0 && is_numeric($product['W/S ex gst'])){
                        $fields = array(
                            "cost_price" => $product['W/S ex gst']
                        );
                        $manager->update_product($fields, $live_product['id']);
                    }
                }
            }
        }



        /* foreach ($this->products as $product_id => $product) {
          if (isset($this->live_products[$product_id]) && $product['Availability'] == 'In Stock' && stripos($this->live_products[$product_id]['name'], "ON SALE") === FALSE
          && stripos($this->live_products[$product_id]['sku'], "NEWOB") === FALSE) {
          $live_product = $this->live_products[$product_id];
          if (strval($live_product['retail_price']) != strval($product['RRP']) && (floatval($product['RRP']) > floatval($product['W/S ex gst'])) && (floatval($live_product['price']) < floatval($product['RRP']))) {
          $fields = array(
          "retail_price" => $product['RRP'],
          "price" => $product['RRP'],
          "cost_price" => $product['W/S ex gst'],
          "calculated_price" => $product['RRP'],
          "sale_price" => 0
          );
          fwrite($this->myFile2, $live_product["sku"] . ',' . $live_product['retail_price'] . '->' . $product['RRP'] . ',' . $live_product['cost_price'] . '->' . $product['W/S ex gst'] . PHP_EOL);
          }
          // stripos($live_product['name'], "ON SALE") !== FALSE
          // if ($this->live_products[$product_id] == '') {
          //     print_r($product_id);
          //     // print_r('------');
          //     print_r($this->live_products[$product_id]);
          //     print_r("<br>");


          $live_product = $this->live_products[$product_id];
          if (isset($live_product) && $live_product != NULL) {
          if ($live_product['retail_price'] != $product['RRP'] && $product['Availability'] == 'In Stock' && ($product['RRP'] > $product['W/S ex gst']) && ($live_product['price'] < $product['RRP'])) {
          $fields = array(
          "retail_price" => $product['RRP'],
          "price" => $product['RRP'],
          "cost_price" => $product['W/S ex gst']
          );
          echo "[sku] === " . $live_product['sku'] . " === " . $live_product['price'] . " <--old ||| new--> " . $product['RRP'] . " IS THIS COST_PRICE?? === " . $product['W/S ex gst'];
          echo "<br>";
          $count ++;
          $manager->update_product($fields, $live_product['id']);
          }
          }
          }
          } */
//        $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . $count . " prices have been update.\n";
        //      fwrite($this->myFile, $txt);
    }

    public function update() {
        /*  $manager = new Api_manager();
          $this->update_outofstock($manager);
          $this->update_discontinued($manager);
          $this->update_available($manager); */
        //    $this->update_hide($manager);
        //$this->update_price($manager);
    }

    public function update_hide($manager) {
        $fields = $this->set_hidden();
        $products = $this->changed_products['hide'];
        foreach ($products as $id) {
            $manager->update_product($fields, $id);
            //https://www.buyorganicsonline.com.au/after-touch-naturl-antibact-hnd-sanitisng-foam-50ml-x12pack/?
        }
    }

    private function get_product_inventory_update($prodid/* , $toactive = NULL */) {
        foreach ($this->live_products as $kid => $live_product) {
            if ($live_product['id'] == $prodid) {
                if ($live_product['inventory_level'] <= 300 && $live_product['inventory_level'] > 0) {
                    return false;
                } elseif (stripos($live_product['name'], "ON SALE") !== FALSE && $live_product['inventory_level'] == 0) {
                    return false;
                } else
                    return true;
                //if ($live_product['inventory_tracking'] == "none" 
                //        || (isset($toactive) && $live_product['inventory_level'] == 0 && $live_product['inventory_tracking'] == "product" && stripos($prod['name'], "ON SALE") === FALSE)) {
                //  return true;
                //}
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
            /* if ($live_product['id'] == $prodid && $live_product['inventory_tracking'] == "product" && $live_product['inventory_level'] > 0) {
              return false;
              } */
        }
        return true;
    }

    // Update as out of stock products that changed their status as out of stock on CSV
    private function get_gst($sku, $fields) {
        if (isset($this->products[$sku]) && isset($this->products[$sku]['GST Status'])) {
            $fields['tax_class_id'] = $this->products[$sku]['GST Status'] == 'GST applies' ? 0 : 1;
        }
        return $fields;
    }

    public function update_outofstock($manager) {
        $products = array();
        if (isset($this->changed_products['Out of Stock']) && isset($this->changed_products['Out of Stock']['No'])) {
            $products = $this->changed_products['Out of Stock']['No'];
            foreach ($products as $kid => $id) {
                if ($this->can_be_updated($id)) {

                    $inv_update = $this->get_product_inventory_update($products[$kid]);
                    $fields = $this->set_outofstock($inv_update);
                    //   echo "<br> - oborne update_outofstock " . $products[$kid];
                    $fields = $this->get_gst($kid, $fields);
                    $this->writeToOutofStockCSV($kid, $id, "set outofstock");
                    $manager->update_product($fields, $products[$kid]);
                }
            }
        }
        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($products) . " out of stock products have been changed.\n";
        fwrite($this->myFile, $txt);
    }

    // Update as discontinued products that changed their status as discontinued on CSV

    public function update_discontinued($manager) {
        $products = array();
        if (isset($this->changed_products['Out of Stock']) && isset($this->changed_products['Out of Stock']['Yes'])) {
            $products = $this->changed_products['Out of Stock']['Yes'];
            foreach ($products as $sku => $id) {
                if ($this->can_be_updated($id)) {
                    $categories = $this->live_products[$sku]['categories'];
                    $fields = $this->set_discontinued($categories);
                    echo "<br> - oborne update_discontinued " . $products[$sku];
                    $this->writeToOutofStockCSV($sku, $id, "set discontinued");
                    $manager->update_product($fields, $products[$sku]);
                    // exit();
                }
            }
        }
        // Log
        $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($products) . " discontinued products have been changed.\n";
        fwrite($this->myFile, $txt);
    }

    // Update as available products that changed their status as available on CSV

    public function update_available($manager) {
        $products = array();
        if (isset($this->changed_products['In Stock'])) {
            $products = $this->changed_products['In Stock'];
            foreach ($products as $pkid => $status) {
                foreach ($status as $sku => $id) {
                    if ($this->can_be_updated($id, true)) {
                        $categories = $this->live_products[$sku]['categories'];
                        $inv_update = $this->get_product_inventory_update($id);
                        $fields = $this->set_available(false, $categories, $inv_update);
                        $fields = $this->get_gst($pkid, $fields);
                        //     echo "<br> - oborne update_available? " . $id;
                        $manager->update_product($fields, $id);
                    }
                    // exit();
                }
            }
        }
        // Log

        $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($products) . " available products have been changed.\n";
        fwrite($this->myFile, $txt);
    }

    public function email() {

        $func = (!empty($_GET["func"])) ? $_GET["func"] : "view";
        $folder = (!empty($_GET["folder"])) ? $_GET["folder"] : "INBOX";
        $uid = (!empty($_GET["uid"])) ? $_GET["uid"] : 0;
        // connect to IMAP
        $mailboxPath = '{imap.gmail.com:993/imap/ssl}INBOX';
        $imap = imap_open($mailboxPath, 'kylie@buyorganicsonline.com.au', 'Fyic2020') or die('Cannot connect to Gmail: ' . imap_last_error());
        $numMessages = imap_num_msg($imap);
        //print($numMessages);
        $ok = 1;
        $i = $numMessages;

        while ($ok) {
            $header = imap_header($imap, $i);
            $fromInfo = $header->from[0];
            $replyInfo = $header->reply_to[0];
            $uid = imap_uid($imap, $i);
            if ($fromInfo->host == 'sent-via.netsuite.com') {
                $body = $this->get_part($imap, $uid, "OTHER");
                // if HTML body is empty, try getting text body
                if ($body == "") {
                    $body = $this->get_part($imap, $uid, "OTHER");
                }
                $ok = 0;
                //exit();
            }
            $i--;
        }
    }

    public function get_part($imap, $uid, $mimetype, $structure = false, $partNumber = false) {

        if (!$structure) {
            $structure = imap_fetchstructure($imap, $uid, FT_UID);
        }
        $attachments = array();
        if (isset($structure->parts) && count($structure->parts)) {
            for ($i = 0; $i < count($structure->parts); $i++) {
                $attachments[$i] = array(
                    'is_attachment' => false,
                    'filename' => '',
                    'name' => '',
                    'attachment' => ''
                );
                if ($structure->parts[$i]->ifdparameters) {
                    foreach ($structure->parts[$i]->dparameters as $object) {
                        if (strtolower($object->attribute) == 'filename') {
                            $attachments[$i]['is_attachment'] = true;
                            $attachments[$i]['filename'] = $object->value;
                        }
                    }
                }

                if ($structure->parts[$i]->ifparameters) {
                    foreach ($structure->parts[$i]->parameters as $object) {
                        if (strtolower($object->attribute) == 'name') {
                            $attachments[$i]['is_attachment'] = true;
                            $attachments[$i]['name'] = $object->value;
                        }
                    }
                }

                if ($attachments[$i]['is_attachment']) {
                    $attachments[$i]['attachment'] = imap_fetchbody($imap, $uid, $i + 1, FT_UID);
                    if ($structure->parts[$i]->encoding == 3) { // 3 = BASE64
                        $attachments[$i]['attachment'] = base64_decode($attachments[$i]['attachment']);
                    } elseif ($structure->parts[$i]->encoding == 4) { // 4 = QUOTED-PRINTABLE
                        $attachments[$i]['attachment'] = quoted_printable_decode($attachments[$i]['attachment']);
                    }

                    $file_name = 'oborne_new.csv';
                    // var_dump($attachments[$i]['attachment']);
                    $this->store_json_file($attachments[$i]['attachment'], $file_name);
                }
            }
        }
        return $attachments;
    }

    public function store_json_file($data, $file_name) {
        $path = 'http://bigcupdate.fyic.com.au/' . $file_name;
        file_put_contents(__DIR__ . '/' . $file_name, $data);
        sleep(1);
        $this->parseCsvSetSize();
        // chmod($filename, 0664);
    }

    private function parseCsvSetSize() {
        $handle = fopen(__DIR__ . '/oborne_new.csv', "r");
        $s = array();
        $row = 1;
        $testfilename = 'ob_size_csv.csv';
        file_put_contents(__DIR__ . '/' . $testfilename, '');
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
                    $columns[] = 'size';
                    file_put_contents(__DIR__ . '/' . $testfilename, implode(',', $columns) . PHP_EOL, FILE_APPEND);
                } else {
                    for ($c = 0; $c < $num; $c++) {
                        $csvdata[$columns[$c]] = $c == 2 ? '"' . $val[$c] . '"' : $val[$c];
                    }
                    $csvdata['size'] = '';
                    preg_match_all('/(TSHC)\d+/', $csvdata[$columns[1]], $matchessku);
                    if (isset($matchessku) && isset($matchessku[0]) && isset($matchessku[0][0])) {
                        $csvdata['size'] = '';
                    } else {
                        $checkvald = $val[2];
                        $pattern2 = '/\d+([\s])?(nd|rd|th|st|e|vol|day|perc|oils|per day|year|iu)+/i';
                        $checkvald = preg_replace($pattern2, ' ', $checkvald);
                        $pattern4 = '/(spf)([\s])?\d+/i';
                        $checkvald = preg_replace($pattern4, '', $checkvald);
                        $pattern3 = '/2inone/i';
                        $checkvald = preg_replace($pattern3, '1 Unit', $checkvald);
                        $pattern1 = '/\d+(oils|extended)/i';
                        $checkvald = preg_replace($pattern1, '1 Unit', $checkvald);
                        $pattern = '/sg|health|6c|skinb5|max|billion|complex|q10|sachets|co2|h2o|bonus|corduroy square|cavity|vitex 100|concentrate|dermal|floral long|multi purpose|corduroy long|(test([A-Za-z]+)?)/i';
                        $checkvald = preg_replace($pattern, '', $checkvald);
                        //     preg_match_all('/((\d+[\.]+)?(\d+[A-Za-z]+))|((\d+[ ])?(test)+)/i', $val[2], $matches);
                        // preg_match_all('/(\d+([A-Za-z ]+)[x]?([\s])?(\d+[A-Za-z ]+))|((\d+[\.]+)?(\d+[A-Za-z]+))|((\d+[ ])?(test)+)/i', $val[2], $matches);

                        preg_match_all('/\d+([A-Za-z]+)?([\s])?[x]([\s])?(\d+([A-Za-z]+)?)/i', $checkvald, $testx);
                        if (isset($testx[0]) && isset($testx[0][0])) {
                            preg_match_all('/(\d+([\.]\d+)?([ A-Za-z]+)?)([\s])?[x]([\s])?(\d+([\.]\d+)?([\s])?([A-Za-z]+)?)(?:([\s])?[x]([\s])?(\d+([\.]\d+)?([ A-Za-z]+)?))/i', $checkvald, $matchesx);
                            $csvdata['size'] = (isset($matchesx) && isset($matchesx[0]) && isset($matchesx[0][0]) ? $matchesx[0][0] : '');
                            if ($csvdata['size'] == '') {
                                preg_match_all('/(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?([\s])?)[x]([\s])?(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?)(?:( x|x)([\s])?(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?))?/i', $checkvald, $matchesx2);
                                $csvdata['size'] = (isset($matchesx2) && isset($matchesx2[0]) && isset($matchesx2[0][0]) ? $matchesx2[0][0] : '');
                            }
                        }
                        /* if (strpos(strtolower($checkvald), "x") > 0) {
                          preg_match_all('/((\d+[\.]?+)?([A-Za-z ]+)[x]([\s])?(\d+[A-Za-z ]+))/i', $checkvald, $matchesx);
                          $csvdata['size'] = (isset($matchesx) && isset($matchesx[0]) && isset($matchesx[0][0]) ? $matchesx[0][0] : '');
                          if ($csvdata['size'] == '' || substr(trim($csvdata['size']), -1) == 'x') {
                          $csvdata['size'] = '';
                          preg_match_all('/(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?([\s])?)[x]([\s])?(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?)(?:( x|x)([\s])?(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?))?/i', $checkvald, $matches);
                          $csvd = (isset($matches) && isset($matches[0]) && isset($matches[0][0]) ? $matches[0][0] : '');
                          if (substr(trim($csvdata['size']), -1) == 'x') {
                          $csvd = mb_substr($csvd, 0, -1);
                          str_replace($csvd, $csvd . ' ', $csvdata['size']);
                          // $checkvald = preg_replace($csvd, $csvd . ' ', $checkvald);
                          preg_match_all('/(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?([\s])?)[x]([\s])?(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?)(?:( x|x)([\s])?(\d+([\.]\d+)?+(?:,\d+)?([A-Za-z]+)?))?/i', $checkvald, $matches);
                          }
                          }
                          } */ else {
                            // preg_match_all('/((\d+[\.]+)?(\d+[A-Za-z]+))|((\d+[ ])?(test)+)/i', $checkvald, $matches);
                            preg_match_all('/\d+([\.]\d+)?([\s])?([A-Za-z]+)([\s])?(\d+([\.]\d+)?([\s])?([A-Za-z]+)?)?/i', $checkvald, $matches2);
                        }
                        /* preg_match_all('/\d+(nd|rd|th|st|E)+/', $checkvald, $matches_number);
                          if (isset($matches_number) && isset($matches_number[0]) && isset($matches_number[0][0])) {
                          $csvdata['size'] = (isset($matches) && isset($matches[0]) && isset($matches[0][1]) ? $matches[0][1] : '');
                          } else { */
                        if ($csvdata['size'] == '')
                            $csvdata['size'] = (isset($matches2) && isset($matches2[0]) && isset($matches2[0][0]) ? $matches2[0][0] : '');
                        //}
                        if ($csvdata['size'] == '') {
                            // preg_match_all('/(\d+([\s])?([A-Za-z]+))([\s])?(\d+([\s])?([A-Za-z]+))/i', $checkvald, $matches2);
                            preg_match_all('/((\d+[\.]+)?(\d+[A-Za-z]+))|((\d+[ ])?(test)+)/i', $checkvald, $matches);
                            $csvdata['size'] = (isset($matches) && isset($matches[0]) && isset($matches[0][0]) ? $matches[0][0] : '');
                        }
                        if (preg_match('/blend|iu|hr|2o|8tion|ply|thermo|plus|hdc|hds|perc|sg|perc|you|5p|strategie|vegan|paleo|edition|edited|by|in|serve|w/i', $csvdata['size']))
                            $csvdata['size'] = (isset($matches2[0][1]) ?
                                    ((/* strpos(strtolower($csvdata['size']), "x") > 0 || */ strpos(strtolower($csvdata['size']), "5p") >= 0) && isset($matches2[0][2]) ? $matches2[0][2] : $matches2[0][1]) : ''
                                    //   ((isset($matches2) && (strpos(strtolower($csvdata['size']), "5p") >= 0) && isset($matches2[0][2])) ? $matches2[0][2] : ($matches2[0][1]?$matches2[0][1]:''))
                                    );

                        // $csvdata['size'] = str_replace("mlx", "ml", $csvdata['size']);
                    }
                    file_put_contents(__DIR__ . '/' . $testfilename, implode(',', $csvdata) . PHP_EOL, FILE_APPEND);
                }
                $row++;
            }
            fclose($handle);
        }
        copy(__DIR__ . '/' . $testfilename, __DIR__ . '/oborne_new.csv');
        chmod(__DIR__ . '/oborne_new.csv', 0766);
        unlink(__DIR__ . '/' . $testfilename);
        return false;
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

            if (isset($this->live_products[$sku]) && ((strpos($this->live_products[$sku]['sku'], 'OB') !== FALSE && strpos($this->live_products[$sku]['sku'], 'OB') >= 0 && strpos($this->live_products[$sku]['sku'], 'OB') < 3) ||
                    (strpos($this->live_products[$sku]['sku'], 'NEWOB') !== FALSE && strpos($this->live_products[$sku]['sku'], 'NEWOB') >= 0 && strpos($this->live_products[$sku]['sku'], 'NEWOB') < 3))
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


         else {
          //read all pages from BC, will see if there are new products
       //   $this->check_new_products($manager->get_sku_all_prods());
          } 

        // if(count($this->products) == 0)
        //     return false;
        /* if (!$manager) {
          $manager = new Api_manager();
          } else {
          $manager->reset_prods();
          }
          echo $step . PHP_EOL;
          $no_pages = 20;
          $rm = $manager->set_products_all($page, false, false, false, $no_pages * $step);
          $this->live_products = $manager->get_products();
          foreach ($this->live_products as $sku => $value) {
          if (isset($this->live_products[$sku]) && ((strpos($this->live_products[$sku]['sku'], 'OB') !== FALSE && strpos($this->live_products[$sku]['sku'], 'OB') >= 0 && strpos($this->live_products[$sku]['sku'], 'OB') < 3) ||
          (strpos($this->live_products[$sku]['sku'], 'NEWOB') !== FALSE && strpos($this->live_products[$sku]['sku'], 'NEWOB') >= 0 && strpos($this->live_products[$sku]['sku'], 'NEWOB') < 3))
          // && !in_array($this->category, $this->live_products[$sku]['categories']) && !in_array($this->review_products_category, $this->live_products[$sku]['categories'])
          ) {

          //   $this->live_products[$sku]['categories'][] = $this->review_products_category;
          //   $manager->update_product(array("categories" => $this->live_products[$sku]['categories']), $this->live_products[$sku]['id']);
          // if((strpos($this->live_products[$sku]['sku'], 'OB') !== FALSE && strpos($this->live_products[$sku]['sku'], 'OB') >= 0 && strpos($this->live_products[$sku]['sku'], 'OB') < 3)){
          $skucc = explode(" - ", $sku);
          array_shift($skucc);
          $skuop = implode($skucc);
          //  } elseif((strpos($this->live_products[$sku]['sku'], 'NEWOB') !== FALSE && strpos($this->live_products[$sku]['sku'], 'NEWOB') >= 0 && strpos($this->live_products[$sku]['sku'], 'NEWOB') < 3) ){
          //  }
          if ($this->live_products[$sku]['bin_picking_number'] && $this->live_products[$sku]['bin_picking_number'] == "notfound") {

          //  $this->live_products[$sku]['categories'][] = 1688;
          //   $manager->update_product(array("categories" => $this->live_products[$sku]['categories']),  $this->live_products[$sku]['id']);
          }
          //if(strlen($skuop)>1 && !isset($this->products[$skuop])){
          //    echo $skuop . " - " . json_encode($this->live_products[$sku]) . PHP_EOL;
          //   $manager->update_product(array("bin_picking_number" => "notfound", "availability" => "disabled"), $this->live_products[$sku]['id']);
          //   fwrite($this->myFile2, 'check - '.$skuop. ' - '  . $this->live_products[$sku]['sku'] . PHP_EOL);
          // }
          // $manager->update_product(array("is_price_hidden" => false), $live_product['id']);
          }
          }

          echo $page + $no_pages . PHP_EOL;
          if (($page + $no_pages) <= $manager->get_total_pages()) {
          $step += 1;
          $do = $this->get_bulk_products($manager, $page + $no_pages, $step);
          } */
    }

    private function sendMail($filepath, $fname) {
        try {
            date_default_timezone_set('Etc/UTC');
            $mail = new PHPMailer(true);
            $mail->IsHTML(true);
            $mail->isSMTP();
            $mail->SMTPDebug = true;
            $mail->Debugoutput = 'html';
            $mail->Host = 'smtp.gmail.com'; //'mail.qsearch.ai';
            $mail->Port = 587;
            $mail->SMTPSecure = 'tls';
            $mail->SMTPAuth = true;
            $mail->Username = "raluca@nextlogic.ro";
            $mail->Password = "passraluk";

            //Recipients
            $mail->setFrom('info@nextlogic.ro', 'Mailer bigcupdate');
            $mail->addAddress('jayson@fyic.com.au', ' ');
            // $mail->addAddress('raluca@nextlogic.ro', ' ');
            $mail->addAttachment($filepath, $fname);         // Add attachments
            // Content
            // $mail->isHTML(true);                                  // Set email format to HTML
            $mail->Subject = 'BC Outofstock or discontinued products';
            $mail->Body = '<h4>Outofstock or discontinued products</h4>';
            $mail->AltBody = 'Here is the outofstock or discontinued';

            $mail->send();
            echo 'Message has been sent';
        } catch (Exception $e) {
            echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
        }
    }

}
