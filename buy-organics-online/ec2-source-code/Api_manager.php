<?php

use Bigcommerce\Api\Client as Bigcommerce;

require 'Api_connection.php';

// require 'BigCommerceSession.php';

require 'vendor/autoload.php';

require 'config/database.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

// include __DIR__ . 'database.php';

class Api_manager extends Api_connection {

    private $products;
    private $auth_token;
    private $client_id;
    private $store_hash;
    private $brands;
    private $live_all_products;
    private $categories = array(
        '1344' => 6,
        '1345' => 5,
        '1346' => 5,
        '1702' => 6
    );
    private $do_not_update_products_from_categ = 1671;

    public function __construct() {
        $this->auth_token = parent::get_auth_token();
        $this->client_id = parent::get_client_id();
        $this->store_hash = parent::get_store_hash();
        $this->products = [];
        $this->brands = [];
    }

    public function get_products() {

        return $this->products;
    }

    public function get_total_pages() {

        return $this->total_pages_bulk;
    }

    public function get_sku_all_prods() {

        return $this->live_all_products;
    }

    public function reset_prods() {
        $this->products = [];
    }

    public function upd_product_images($image_url, $product_id, $image_id) {
        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products/' . $product_id . '/images/' . $image_id;// . "?image_url=".$image_url;
        
        $headers = $this->buildHeaders();
        $data_string = json_encode(array("image_url" => $image_url));
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response, true);
        
        return $result;
    }
    public function get_product_by_variant($paramdata) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';

        $headers = $this->buildHeaders();
        $ch = curl_init();
        //   $params = "?page={$page}&limit=50";
        $params = '';

        $params .= $paramdata; //  "?sku=UN%20-%20" . $sku;

        $api_url .= $params;  echo $api_url."<br>".PHP_EOL;
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch); echo $result;
        $result = json_decode($response, true);
curl_close($ch);
        // return false;
        // print_r($this->categories[$category]);

        if (!empty($result['data'])) {
            return $result['data'];
        } else
            return '0';
        // return false;
    }

    public function get_products_by_sku($sku = false) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';

        $headers = $this->buildHeaders();
        $ch = curl_init();
        //   $params = "?page={$page}&limit=50";
        $params = '';
        if ($sku !== false) {
            $params .= "?sku=UN%20-%20" . $sku;
        }

        $api_url .= $params;
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response);
        // file_put_contents('oborne_log.txt',$response, FILE_APPEND);
        // return false;
        // print_r($this->categories[$category]);

        if (!empty($result->data)) {
            return $result->data[0];
        } else
            return '0';
        // return false;
    }

    public function get_product_by_id($id, $webhooks = NULL) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products/' . $id;

        $headers = $this->buildHeaders();
        $ch = curl_init();
        //   $params = "?page={$page}&limit=50";
        $params = '';
        if ($webhooks !== false) {
            $params .= "?include_fields=name%2Csku%2Cavailability%2Cinventory_tracking%2Cinventory_level%2Cinventory_warning_level%2Cis_price_hidden%2Cis_visible";
        }

        $api_url .= $params;
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response, true);

        // return false;
        // print_r($this->categories[$category]);

        if (!empty($result['data'])) {
            return $result['data'];
        } else
            return '0';
        // return false;
    }

    public function set_products($page = 1, $category = false, $product_id = false, $not_in_categ = false, $no_pages = false) {

        if ($no_pages !== false && ($page > $no_pages || (isset($this->total_pages) && $page > $this->total_pages))) {
            if (isset($this->total_pages)) {
                return $this->total_pages;
            } else {
                return $page;
            }
        }

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';
        $headers = $this->buildHeaders();
        $ch = curl_init();
        $params = "?page={$page}&limit=50";
        if ($category !== false) {
            $params .= "&categories:in=" . $category;
            $params .= "&categories:not_in=" . $this->do_not_update_products_from_categ;
            if ($not_in_categ !== false) {
                $params .= "," . $not_in_categ;
                //  $params .= "&is_visible=true";
            }
        }


        if ($product_id !== false) {
            $params .= "&id=" . $product_id;
        }

        $api_url .= $params;


        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);

        $result = json_decode($response);
        // file_put_contents('oborne_log.txt',$response, FILE_APPEND);
        // return false;
        // print_r($this->categories[$category]);
        $this->total_pages_bulk = $this->total_pages($result);
        if (!empty($result->data)) {
            $copy_products = $this->products;
            $this->products = $copy_products + $this->parse_products($result, $this->categories[$category], $no_pages);
            if ($product_id === false && $category !== false && $page + 1 <= $this->total_pages($result)) {
                $this->set_products($page + 1, $category, $product_id, $not_in_categ, $no_pages);
            }
            // return true;
        } else {
            return false;
        }
        // return false;
    }

    public function parse_brands($brands) {

        $data = array();
        foreach ($brands->data as $key => $brand) {
            $data[$brand->name] = $brand->id;
        }



        return $data;
    }

    public function parse_products($products, $pos, $no_pages = false) {

        if (!isset($this->live_all_products) && $no_pages !== false) {
            $this->live_all_products = [];
        }
        $data = array();

        // var_dump($products->meta->pagination->total_pages);

        foreach ($products->data as $key => $product) {
            $sku = $this->parse_sku($product->sku, $pos);
            if (strpos($sku, ' - ') === 0) {
                $sku = substr_replace($sku, "", 0, 3);
            }
            // $sku                              = $product->sku;
            // print_r($sku);
            // echo "<br>";

            $data[$sku] = [];

            //  $data[$sku]['sku'] = $product->name;
            $data[$sku]['name'] = $product->name;
            $data[$sku]['page_title'] = $product->page_title;

            $data[$sku]['id'] = $product->id;

            $data[$sku]['sku'] = $product->sku;

            $data[$sku]['brand'] = $product->brand_id;

            $data[$sku]['retail_price'] = $product->retail_price;

            $data[$sku]['price'] = $product->price;

            $data[$sku]['cost_price'] = $product->cost_price;

            $data[$sku]['categories'] = $product->categories;

            $data[$sku]['type'] = $product->type;

            $data[$sku]['is_visible'] = $product->is_visible;

            $data[$sku]['availability'] = $product->availability;

            $data[$sku]['price_hidden_label'] = $product->price_hidden_label;

            $data[$sku]['is_price_hidden'] = $product->is_price_hidden;

            $data[$sku]['description'] = $product->description;

            $data[$sku]['inventory_tracking'] = $product->inventory_tracking;
            $data[$sku]['inventory_level'] = $product->inventory_level;
            $data[$sku]['sale_price'] = $product->sale_price;
            $data[$sku]['upc'] = $product->upc;
            
            if ($no_pages !== false) {  // this is for products processed by bulk
                $this->live_all_products[$sku] = $data[$sku]['sku'];
            }
        }

        return $data;
    }

    public function parse_sku($sku, $pos) {



        // var_dump($sku);

        $without_kad_pos = $pos;

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

    public function total_pages($products) {
        try {
            $total = $products->meta->pagination->total_pages;
        } catch (Exception $er) {
            $total = 0;
        }
        return $total;
    }

    public function update_product($data, $product_id) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products/' . $product_id;

        $headers = $this->buildHeaders();
        $data_string = json_encode($data);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response, true);

        if (isset($result) && isset($result['data'])) {
            if (isset($result['data'][0]) && isset($result['data'][0]['id'])) {
                echo ', upd ' . $result['data'][0]['id'];
            } elseif (isset($result['data']) && isset($result['data']['id'])) {
                echo ', upd ' . $result['data']['id'];
            }
        }
    }

    public function delete_product($product_id) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products/' . $product_id;

        $headers = $this->buildHeaders();
        // $data_string = json_encode($data);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        // curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response, true);

        /* if (isset($result) && isset($result['data'])) {
          if (isset($result['data'][0]) && isset($result['data'][0]['id'])) {
          echo ', upd ' . $result['data'][0]['id'];
          } elseif (isset($result['data']) && isset($result['data']['id'])) {
          echo ', upd ' . $result['data']['id'];
          }
          } */
        return true;
    }

    public function insert_product($data) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';
        $headers = $this->buildHeaders();
        //$data_string = json_encode($data);
        $data_string = $data;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        //   var_dump($response);
        $result = json_decode($response, true);
        curl_close($ch);
        //print_r($result);
        return $result;
    }

    public function set_brands($page = 1, $name = false) {
        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/brands';
        $headers = $this->buildHeaders();
        $params = "?page=" . $page . "&limit=50";
        if ($name != false) {
            $params .= "&name=" . $name;
        }
        $api_url .= $params;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);

        curl_setopt($ch, CURLOPT_VERBOSE, 0);

        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');

        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

        //set the headers using the array of headers

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response);
        if (!empty($result->data)) {

            $copy_brands = $this->brands;
            $this->brands = $copy_brands + $this->parse_brands($result);
            if ($page + 1 <= $this->total_pages($result)) {
                $this->set_brands($page + 1);
            }
        }
    }

    public function get_brands() {

        return $this->brands;
    }

    public function insert_brand($data) {
        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/brands';
        $headers = $this->buildHeaders();
        $data_string = json_encode($data);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $result = json_decode($response, true);
        curl_close($ch);
        return $result;
    }

    private function buildHeaders() {



        $headers = array(
            'X-Auth-Client: ' . $this->client_id,
            'X-Auth-Token: ' . $this->auth_token,
            'Content-Type: ' . 'application/json'
        );

        return $headers;
    }

    public function set_products_all($page = 1, $category = false, $product_id = false, $not_in_categ = false, $no_pages = false, $check_do_not_update_prods = false) {

        if ($no_pages !== false && ($page > $no_pages || (isset($this->total_pages) && $page > $this->total_pages))) {
            if (isset($this->total_pages)) {
                return $this->total_pages;
            } else {
                return $page;
            }
        }

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';
        $headers = $this->buildHeaders();
        $ch = curl_init();
        $params = "?page={$page}&limit=50";
        if ($category !== false) {
            $params .= "&categories:in=" . $category;
            if ($check_do_not_update_prods === false)
                $params .= "&categories:not_in=" . $this->do_not_update_products_from_categ;
            if ($not_in_categ !== false) {
                if ($check_do_not_update_prods !== false) {
                    $params .= "&categories:not_in=";
                }
                $params .= "," . $not_in_categ;
                //  $params .= "&is_visible=true";
            }
        }
        $api_url .= $params;
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_VERBOSE, 0);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        //set the headers using the array of headers

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);

        $result = json_decode($response);
        // file_put_contents('oborne_log.txt',$response, FILE_APPEND);
        // return false;
        // print_r($this->categories[$category]);
        $this->total_pages_bulk = $this->total_pages($result);
        if (!empty($result->data)) {
            $copy_products = $this->products;
            $this->products = $copy_products + $this->parse_products_all($result);
            if ($product_id === false && $page + 1 <= $this->total_pages($result)) {
                $this->set_products_all($page + 1, $category, $product_id, $not_in_categ, $no_pages, $check_do_not_update_prods);
            }
            // return true;
        } else {
            return false;
        }
        // return false;
    }

    public function parse_products_all($products) {
        $data = array();
        // var_dump($products->meta->pagination->total_pages);
        foreach ($products->data as $key => $product) {
            $sku = $product->sku;
            $data[$sku] = [];
            $data[$sku]['name'] = $product->name;
            $data[$sku]['id'] = $product->id;
            $data[$sku]['availability'] = $product->availability;
            $data[$sku]['is_visible'] = $product->is_visible;
            $data[$sku]['sku'] = $product->sku;
            $data[$sku]['categories'] = $product->categories;
            $data[$sku]['bin_picking_number'] = $product->bin_picking_number;
        }

        return $data;
    }

}
