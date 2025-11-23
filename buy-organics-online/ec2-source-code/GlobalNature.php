<?php

use Bigcommerce\Api\Client as Bigcommerce;

include_once 'Supplier.php';
include_once 'Api_manager.php';
require 'vendor/autoload.php';
require 'config/database.php';
include_once 'vendor/PHPExcel/Classes/PHPExcel.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

class GlobalNature implements Supplier {
    private $name;
    private $url;
    private $products;
    private $myFile;
    private $myFile2;
    private $changed_products = array();
    private $live_products;
    private $new_products;
    private $category = 1702;  //1346
    private $new_products_category = 1703;
    private $review_products_category = 1704;  // globalbynature review
    private $disabled_category = 1704;  //disabled 

    public function __construct($name, $url) {
        ini_set('max_execution_time', 0);
        //    echo '<br><br>start GlobalNature ' . date("Y-m-d h:i:sa") . '<br>';
        $this->email();
        $this->name = $name;
        $this->url = "/var/www/bigcupdate.fyic.com.au/web/globalnature_new.csv"; //$url;
        $this->myFile = fopen("/var/www/bigcupdate.fyic.com.au/web/update_activity.txt", "a") or die("Unable to open file!");
        //  $this->myFile2 = fopen("OB_prods_notupdating.csv", "a") or die("Unable to open file!");
        $this->myFile3 = fopen("/var/www/bigcupdate.fyic.com.au/web/GBB_prods_price.csv", "a") or die("Unable to open file!");
        //  $this->myFile4 = fopen("OB_check_price.log", "a") or die("Unable to open file!");
        $this->myFileoutofstock = "/var/www/bigcupdate.fyic.com.au/web/prods_outofstock.csv";
        if (file_exists($this->myFileoutofstock) === true) {
            file_put_contents($this->myFileoutofstock, 'GBN ' . date("Y-m-d h:i:sa") . PHP_EOL, FILE_APPEND);
        } else {
            file_put_contents($this->myFileoutofstock, 'GBN ' . date("Y-m-d h:i:sa") . PHP_EOL);
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

    public function testText(){
        echo "testText()";
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
                            $columns[$c] = trim($val[$c]);
                        }
                    }
                } else {
                    for ($c = 0; $c < $num; $c++) {
                        $csvdata[$columns[$c]] = trim($val[$c]);
                    }
                    $s[$csvdata[$columns[0]]] = $csvdata;
                }
                $row++;
            }
            fclose($handle);
        }
        array_pop($s);
        if (!empty($s)) {
            $txt = "[" . date("Y-m-d h:i:sa") . "] [GlobalNature] " . count($s) . " products in CSV.\n";
            fwrite($this->myFile, $txt);
            $this->products = $s;
        }
        return false;
    }

    /* public function get_one_product_sku($sku) {
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
      } */

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
        $cc = 0;
        // echo $live_all_products;
        foreach ($this->products as $sku => $value) {
            $cc += 1;
            //   echo "<br>".$sku;
            if (!isset($live_all_products[$sku]) && (($value['rrp'] > $value['wholesale']) || ($value['rrp'] == 0 && $value['wholesale'] > 0))) {
                if ((trim($value['stockstatus']) == 'available' || trim($value['stockstatus']) == 'outofstock') && $value['wholesale'] != 0) {
                    $this->new_products[] = $sku;
                    // echo "<br>-". $value['stockstatus'] . ", " . ((trim($value['stockstatus']) == 'available' || trim($value['stockstatus']) == 'outofstock')?"true":"false") 
                    //        . ", " .($value['wholesale'] != 0 ?"true":"false");
                }
            }/* else {
              $cc+=1;
              if(isset($live_all_products[$sku])) echo "<br>Sku exists";
              elseif(!($value['rrp'] > $value['wholesale'] || ($value['rrp'] == 0 && $value['wholesale'] > 0))){
              echo "<br>int vals - " . $value['rrp'] . " - " . $value['wholesale'] . " to " . (float)$value['rrp'] . " > ".(float)$value['wholesale'];
              } else {
              echo "<br>?? - " . $sku;
              }
              } */
        }

        if (isset($this->new_products) && count($this->new_products) > 0) {
            $this->insert_new_products_on_live();
        }
    }

    public function test_prices($manager = NULL){
        if (!$manager) {
            $manager = new Api_manager();
        } else {
            $manager->reset_prods();
        }
        $this->update_price($manager);
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
        $this->changed_products = array();
        $active_products = array();
        if(!isset($this->to_disable)){
            $this->to_disable = array();
        }
        foreach ($this->products as $sku => $value) {
            if (isset($this->live_products[$sku]) && $this->live_products[$sku]['sku'] != 'NEWGBN - ' . $sku) {
                $active_products[$sku] = $value;
            } else {
               // $this->to_disable[$sku] = $this->live_products[$sku]['id'];
            }
        }
        /*   $this->changed_products = array();
          $this->check_new_products($manager->get_sku_all_prods());
         */
        
        

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
            //   $this->check_new_products($manager->get_sku_all_prods());
        }
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
            preg_match('!\d+!', $weight, $matches);
            $quan = $matches[0];
            if ($quan != "") {
                return $quan;
            }
            return 0;
        }

        return (int) substr($weight, 0, $position);
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
        echo count($new_products) . ">>";
        foreach ($new_products as $key => $sku) {
            if (isset($review_prods) && !isset($review_prods['GBN - ' . $feed_products[$sku]['Item Code']]) && !isset($review_prods['NEWGBN - ' . $feed_products[$sku]['Item Code']]) && (isset($dont_update) && !isset($dont_update['GBN - ' . $feed_products[$sku]['Item Code']]) && !isset($dont_update['NEWGBN - ' . $feed_products[$sku]['Item Code']]))
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
                            echo "added brand_id " . $id_brand . PHP_EOL;
                        }
                    } else {
                        $id_brand = $brands[$brand_found_name];
                    }
                }

                if (isset($id_brand)) {
                    echo "<br> " . $sku . " - ";
                    if (isset($feed_products[$sku]['Item Code']) && isset($feed_products[$sku]['rrp']) && $feed_products[$sku]['rrp'] != "") {
                        $weight = $this->parse_weight($feed_products[$sku]['size']);
                        $data = array('name' => ucfirst($feed_products[$sku]['description']),
                            'sku' => 'NEWGBN - ' . $feed_products[$sku]['Item Code'],
                            'brand_id' => $id_brand,
                            'retail_price' => $feed_products[$sku]['rrp'],
                            'price' => $feed_products[$sku]['rrp'],
                            'cost_price' => $feed_products[$sku]['wholesale'],
                            'categories' => $categories,
                            'type' => 'physical',
                            'weight' => $weight,
                            'upc' => trim($feed_products[$sku]['barcode']),
                            'gtin' => trim($feed_products[$sku]['barcode']),
                            "availability" => "disabled",
                            "inventory_level" => 0,
                            "inventory_tracking" => "product",
                            "is_visible" => false/* ,
                                  "images" => array(array("image_url" => "{replimg}", "is_thumbnail" => true, "sort_order" => 1, "description" => $feed_products[$sku]['description'])) */
                        );
                        $imageok = false;

                        if (trim($feed_products[$sku]['Image Src']) != "") {
                            $imageok = true;
                            $data["images"] = array(array("image_url" => "{replimg}", "is_thumbnail" => true, "sort_order" => 1, "description" => $feed_products[$sku]['description']));
                        }

                        $errstep = 0;
                        $stop = false;
                        do {
                            $encdata = json_encode($data);
                            // $senddata = str_replace("{replimg}", stripcslashes($feed_products[$sku]['Image Src']), $encdata);
                            if ($imageok == true || isset($data["images"])) {
                                $dd = strtok(stripcslashes($feed_products[$sku]['Image Src']), "?");
                                $status = $manager->insert_product(str_replace("{replimg}", $dd, $encdata));
                            } else {
                                $status = $manager->insert_product($encdata);
                            }
                            $imageok = false;
                            if (isset($status) && !isset($status['errors'])) {
                                $countnew += 1;
                                $stop = true;
                                echo "new GBN - " . $data['sku'];
                            } else {
                                if ($status['title'] === 'The product name is a duplicate') {
                                    //if ($errstep == 0) {
                                    $data['name'] .= " - " . $feed_products[$sku]['brand'] . " " . $feed_products[$sku]['Item Code'];
                                    //} 

                                    /*  if ($errstep == 2) {
                                      $txt = "[" . date("Y-m-d h:i:sa") . "] [GBN]  error adding new prod " . $data['sku'] . ".\n";
                                      fwrite($this->myFile, $txt);
                                      } */
                                    $errstep += 1;
                                } elseif (strpos($status['title'], 'image_url') !== false) {
                                    //   $data["images"][0]["image_url"] = strtok( $data["images"][0]["image_url"], "?");
                                    $errstep += 1;
                                } else {
                                    if ($errstep < 3) {
                                        
                                    } else {

                                        $stop = true;
                                        $txt = "[" . date("Y-m-d h:i:sa") . "] [GBN]  error adding new prod " . $data['sku'] . ".\n";
                                        fwrite($this->myFile, $txt);
                                    }
                                    $errstep += 1;
                                }

                                echo 'err - ' . $status['title'] . " " . $errstep . "<br>";
                                echo "-" . $encdata . "-<br>";
                            }
                        } while ($stop != true && $errstep <= 3);
                        sleep(3);
                    }
                }
            }
        }
        //   echo '>> newprods>>' . $countnew;
        exit();
    }

    public function do_bulk_newg($manager = NULL, $page = 1, $step = 1) {
        if (!$manager) {
            $manager = new Api_manager();
        } else {
            $manager->reset_prods();
        }
        $no_pages = 20;
        $rm = $manager->set_products($page, $this->category, false, false, $no_pages * $step);

        $this->live_products = $manager->get_products();

        foreach ($this->products as $sku => $fprod) {
            if (isset($this->live_products[$sku])) {
                //update
                /*   $okbrand = false;
                  $brandname = NULL;
                  foreach ($this->brands as $brname => $bb) {
                  if ($bb == $this->live_products[$sku]['brand']) {
                  $okbrand = true;
                  $brandname = $brname;
                  break;
                  }
                  }
                  if ($okbrand == false) {
                  echo 'new brand ' . $fprod['brand'] . '<br>' . PHP_EOL;
                  }

                  $fields = array('name' => ucfirst($fprod['brand']) . ' ' . ucfirst($fprod['description']) . ' ' . $fprod['size'],
                  'sku' => 'NEWGBN - ' . $fprod['sku'],
                  'retail_price' => $fprod['rrp'],
                  'price' => $fprod['rrp'],
                  'cost_price' => $fprod['wholesale'],
                  'type' => 'physical',
                  'upc' => trim($fprod['barcode']),
                  'gtin' => trim($fprod['barcode'])
                  );
                  $manager->update_product($fields, $this->live_products[$sku]['id']); */
                //   echo 'updated ' . $this->live_products[$sku]['id'] . '<br>' . PHP_EOL;
            } else {
                $add = true;
                $categories = [$this->new_products_category, $this->category, $this->review_products_category];
                $elm = $manager->get_product_by_variant("?upc=" . $fprod['barcode']);
                if (isset($elm) && $elm == '0') {
                    $brand_name = $fprod['brand'];
                    // if (strpos($brand_name, "\"") !== false) {
                    //     $brand_name = explode("\"", $brand_name)[1];
                    // }
                    if ($brand_name != null) {
                        $found = array_key_exists(strtoupper($brand_name), array_change_key_case($this->brands, CASE_UPPER));
                        if ($found && $found == 1) {
                            $brarr = array_change_key_case($this->brands, CASE_UPPER);
                            $id_brand = $brarr[strtoupper($brand_name)];
                            $weight = $this->parse_weight($fprod['size']);
                            $data = array('name' => ucfirst($fprod['brand']) . ' ' . ucfirst($fprod['description']) . ' ' . $fprod['size'],
                                'sku' => 'NEWGBN - ' . $fprod['sku'],
                                'brand_id' => $id_brand,
                                'retail_price' => $fprod['rrp'],
                                'price' => $fprod['rrp'],
                                'cost_price' => $fprod['wholesale'],
                                'categories' => $categories,
                                'type' => 'physical',
                                'weight' => $weight,
                                'upc' => trim($fprod['barcode']),
                                'gtin' => trim($fprod['barcode']),
                                "availability" => "disabled",
                                "inventory_level" => 0,
                                "inventory_tracking" => "product",
                                "is_visible" => false/* ,
                                      "images" => array(array("image_url" => "{replimg}", "is_thumbnail" => true, "sort_order" => 1, "description" => $feed_products[$sku]['description'])) */
                            );
                            $encdata = json_encode($data);
                            $status = $manager->insert_product($encdata);
                            echo 'insert prod ' . $fprod['barcode'] . '<br>' . PHP_EOL;
                        }
                        /* $brand_found_name = $this->brand_exists($manager->get_brands(), $brand_name);
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
                          echo json_encode($branddata);
                          if (isset($branddata['data'])) {
                          $brand_id = $branddata['data'];
                          $brands[$brand_id['name']] = $brand_id['id'];
                          $id_brand = $brand_id['id'];
                          echo "added brand_id " . $id_brand . PHP_EOL;
                          }
                          return false;
                          exit(0);
                          } */ /* else {
                          $id_brand = $brands[$brand_found_name];
                          } */
                    }
                }
            }
        }
        /* $active_products = array();
          foreach ($this->products as $sku => $value) {
          if (isset($this->live_products[$sku]) && $this->live_products[$sku]['sku'] != 'NEWOB - ' . $sku) {
          $active_products[$sku] = $value;
          }
          }
          $this->changed_products = array();
          $this->set_changed_products($active_products);
          $this->update_outofstock($manager);
          $this->update_discontinued($manager);
          $this->update_available($manager);
          $this->update_price($manager);
         */
        if (($page + $no_pages) <= $manager->get_total_pages()) {
            $step += 1;
            $do = $this->do_bulk_newg($manager, $page + $no_pages, $step);
        } else {
            //read all pages from BC, will see if there are new products
            //  $this->check_new_products($manager->get_sku_all_prods());
        }
    }

    public function checkProdsSet() {
        $manager = new Api_manager();
        $manager->set_brands();
        $this->brands = $manager->get_brands();

        $this->url = "GBN_uniqueprods.csv";
        $this->okupdate = NULL;
        $this->set_feed_products();
        $this->do_bulk_newg();
    }

    public function set_changed_products($active_products) {

        // Log
   //     $txt = "[" . date("Y-m-d h:i:sa") . "] [GlobalNature] " . count($active_products) . " active products from CSV.\n";

   //     fwrite($this->myFile, $txt);

        foreach ($active_products as $sku => $value) {
            $status1 = $value['stockstatus']; 
            if ($this->is_status($status1, $sku) == true && isset($this->live_products[$sku])) { //1413 , sku: OB - MCMOSP
                $this->changed_products[$status1][$sku] = $this->live_products[$sku]['id'];
            }
        }
        // file_put_contents('OB_IN_STOCK.txt',json_encode($this->changed_products), FILE_APPEND);
        // print_r($this->changed_products);
    }

    public function is_status($status1, $sku) {
        $product = json_decode(json_encode($this->live_products[$sku]), true);
        if (in_array($this->review_products_category, $product['categories']) || in_array($this->disabled_category, $product['categories'])) { 
            return false;
        }
        if (isset($product['name']) && isset($product['description']) && (strlen($product['description']) > strlen($product['name']))) {
            if ($status1 == 'outofstock') {
                if ($product['is_visible'] == true || $product['availability'] == 'available' /* ||  $product['is_price_hidden'] == false ||  $product['price_hidden_label'] != 'This product is out of stock' */) {
                    return true;
                }
            }
            if ($status1 == 'available') {
                if (($product['is_visible'] == false || $product['availability'] == 'disabled' || ($product['availability'] == 'available' && $product['inventory_level'] == 0)
                        /* ||  $product['is_price_hidden'] == true || $product['price_hidden_label'] != '' */) /* && !in_array($new_oborne_category, $product['categories']) */) {
                    return true;
                }
            }
        }
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
        // $manager->set_products(1, $this->category);
        // $this->live_products = $manager->get_products();
        // print_r($this->live_products);
        // die;
        // $count = 0;
        fwrite($this->myFile3, date("Y-m-d h:i:sa") . PHP_EOL);
        foreach ($this->products as $product_id => $product) {
            if (isset($this->live_products[$product_id])) {
                $live_product = $this->live_products[$product_id];
                if (stripos($live_product['name'], "ON SALE") == FALSE && stripos($live_product['sku'], "NEWGBN") === FALSE) {
                    if (strval($live_product['retail_price']) != strval($product['rrp']) && $product['stockstatus'] == 'available' && (floatval($product['rrp']) > floatval($product['wholesale'])) &&
                            (floatval($live_product['price']) < floatval($product['rrp']))) {
                        if ($live_product['sale_price'] != 0) {
                            $newsaleprice = floatval($product['rrp']) - (floatval($product['rrp']) * 8 / 100);
                            if ($live_product['sale_price'] > $newsaleprice && $newsaleprice > floatval($product['wholesale'])) {
                                $newsaleprice = $live_product['sale_price'];
                            } elseif ($live_product['sale_price'] > $newsaleprice && $live_product['sale_price'] <= $product['wholesale']) {
                                $newsaleprice = 0;
                            } elseif ($live_product['sale_price'] <= $newsaleprice && $newsaleprice <= floatval($product['wholesale'])) {
                                $newsaleprice = 0;
                            }
                        } else
                            $newsaleprice = 0;
                        $fields = array(
                            "retail_price" => $product['rrp'],
                            "price" => $product['rrp'],
                            "cost_price" => $product['wholesale'],
                            "calculated_price" => $product['rrp'],
                            "sale_price" => $newsaleprice
                        );
                        fwrite($this->myFile3, $live_product["sku"] . "," . $live_product['price'] . "," . $product['rrp']
                                . "," . $live_product['cost_price'] . "," . $product['wholesale'] . "," . $live_product['sale_price'] . "," . $newsaleprice . PHP_EOL);
                        $manager->update_product($fields, $live_product['id']);
                    } elseif (strval($live_product['retail_price']) != strval($product['rrp']) && $product['stockstatus'] == 'available' && (floatval($product['rrp']) <= floatval($product['wholesale'])) &&
                            (floatval($live_product['price']) < floatval($product['rrp']))) {
                        fwrite($this->myFile4, $live_product["sku"] . PHP_EOL);
                    }
                }
            }
        }
    }

  public function update() {
     //   $manager = new Api_manager();
    //    $this->update_outofstock($manager);
        // $this->update_discontinued($manager);
      //  $this->update_available($manager);
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

    private function writeToOutofStockCSV($sku, $id, $status) {
        file_put_contents($this->myFileoutofstock, $sku . "," . $id . "," . $status . PHP_EOL, FILE_APPEND);
    }

    // Update as out of stock products that changed their status as out of stock on CSV

    public function update_outofstock($manager) {
        $products = array();
        if (isset($this->changed_products['outofstock'])) {
            $products = $this->changed_products['outofstock'];
            foreach ($products as $kid => $id) {
                if ($this->can_be_updated($id)) {
                    $inv_update = $this->get_product_inventory_update($products[$kid]);
                    $fields = $this->set_outofstock($inv_update);
                    $this->writeToOutofStockCSV($kid, $id, "set outofstock");
                  
                    $manager->update_product($fields, $products[$kid]);
                }
            }
        }
        // Log
     //   $txt = "[" . date("Y-m-d h:i:sa") . "] [GBN] " . count($products) . " out of stock products have been changed.\n";
      //  fwrite($this->myFile, $txt);
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
                    // echo "<br> - oborne update_discontinued " . $products[$sku];
                    $manager->update_product($fields, $products[$sku]);
                    // exit();
                }
            }
        }
        // Log
      //  $txt = "[" . date("Y-m-d h:i:sa") . "] [Oborne] " . count($products) . " discontinued products have been changed.\n";
      //  fwrite($this->myFile, $txt);
    }

    // Update as available products that changed their status as available on CSV

    public function update_available($manager) {
        $products = array();
        if (isset($this->changed_products['available'])) {
            $products = $this->changed_products['available'];
            foreach ($products as $pkid => $id) {
               // foreach ($status as $sku => $id) {
                    if ($this->can_be_updated($id, true)) {
                        $categories = $this->live_products[$pkid]['categories'];
                        $inv_update = $this->get_product_inventory_update($id);
                        $fields = $this->set_available(false, $categories, $inv_update);
                        $manager->update_product($fields, $id);
                    }
                    // exit();
               // }
            }
        }
        // Log

      //  $txt = "[" . date("Y-m-d h:i:sa") . "] [GBN] " . count($products) . " available products have been changed.\n";
      //  fwrite($this->myFile, $txt);
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
            if ($fromInfo->host == 'globalbynature.com.au') {
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

    private function convertXLStoCSV($infile, $outfile) {
        echo $outfile;
        $fileType = PHPExcel_IOFactory::identify($infile);
        $objReader = PHPExcel_IOFactory::createReader($fileType);

        $objReader->setReadDataOnly(true);
        $objPHPExcel = $objReader->load($infile);

        $objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'CSV');
        $objWriter->save($outfile);
        $this->fix_csv($outfile);
    }

    private function fix_csv($outfile) {
        $handle = fopen($outfile, "r");
        $handlew = fopen(__DIR__ . "/" . "globalnature_new_fix.csv", "w");
        $s = array();
        $row = 1;
        if ($handle !== FALSE) {
            while (($val = fgetcsv($handle, 0, ",")) !== FALSE) {
                $num = count($val);
                $flag = true;
                if ($row > 1) {
                    for ($c = 0; $c < $num; $c++) {
                        if (isset($val[$c])) {
                            $val[$c] = trim($val[$c]);
                            if ($c == 2 && strlen($val[$c]) == 0) {
                                $flag = false;
                                break;
                            }
                        }
                    }
                    if ($flag == true) {
                        $val1 = preg_replace('/[^(\x20-\x7F)]*/', '', $val);
                        fputcsv($handlew, $val1);
                    }
                }
                $row++;
            }
            fclose($handle);
            fclose($handlew);
        }
        rename(__DIR__ . "/" . "globalnature_new_fix.csv", $outfile);
        return false;
    }

    public function get_part($imap, $uid, $mimetype, $structure = false, $partNumber = false) {

        if (!$structure) {
            $structure = imap_fetchstructure($imap, $uid, FT_UID);
        }

        $attachments = array();
        if (isset($structure->parts) && count($structure->parts)) {
            $file_name = 'globalnature_new.xlsx';
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

                    $this->store_json_file($attachments[$i]['attachment'], $file_name);
                    $this->convertXLStoCSV(__DIR__ . "/" . $file_name, __DIR__ . "/globalnature_new.csv");

                    /* $attachments[$i]['attachment'] = imap_fetchbody($imap, $uid, $i + 1, FT_UID);
                      if ($structure->parts[$i]->encoding == 3) { // 3 = BASE64
                      $attachments[$i]['attachment'] = base64_decode($attachments[$i]['attachment']);
                      } elseif ($structure->parts[$i]->encoding == 4) { // 4 = QUOTED-PRINTABLE
                      $attachments[$i]['attachment'] = quoted_printable_decode($attachments[$i]['attachment']);
                      }

                      //     $file_name = 'globalnature_new.csv';
                      //     $this->store_json_file($attachments[$i]['attachment'], $file_name); */
                }
            }
            unlink(__DIR__ . "/" . $file_name);
        }
        return $attachments;
    }

    public function store_json_file($data, $file_name) {
        $path = 'http://bigcupdate.fyic.com.au/' . $file_name;
        file_put_contents(__DIR__ . '/' . $file_name, $data);

        // chmod($filename, 0664);
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

            if (isset($this->live_products[$sku]) && ((strpos($this->live_products[$sku]['sku'], 'GBN') !== FALSE && strpos($this->live_products[$sku]['sku'], 'GBN') >= 0 && strpos($this->live_products[$sku]['sku'], 'GBN') < 3) ||
                    (strpos($this->live_products[$sku]['sku'], 'NEWGBN') !== FALSE && strpos($this->live_products[$sku]['sku'], 'NEWGBN') >= 0 && strpos($this->live_products[$sku]['sku'], 'NEWGBN') < 3))
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
    }

}
