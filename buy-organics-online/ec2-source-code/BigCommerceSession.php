<?php

/*

  To make requests to Big Commerce API use the following Composer command to install the API client:

  $ composer require bigcommerce/api

  $ composer update



  Visit https://github.com/bigcommerce/bigcommerce-api-php for more information.

 */

use Bigcommerce\Api\Client as Bigcommerce;

class BigCommerceSession {

    private $auth_token;
    private $client_id;
    private $store_hash;

    /** __construct

      Constructor to make a new instance of BigCommerce with the details needed to make a call

      Input:	$auth_token - the authentication token fir the user making the call

      $client_id - Developer key obtained when registered at https://developer.bigcommerce.com/

      $store_hash - The Bigcommerce store hash value can be derived from your temp URL. For example, if your temp URL is http ://store-xxxxxxxxx.mybigcommerce.com/ then your store_hash value is the xxxxxxxxx. Also you can find it here GET /stores/{store_hash}/v2/products/{product_id}/custom_fields/{id}.



      Output:	Response string returned by the server

     */
    public function __construct($auth_token, $client_id, $store_hash) {



        $this->auth_token = $auth_token;

        $this->client_id = $client_id;

        $this->store_hash = $store_hash;
    }

    public function configure_v2() {



        Bigcommerce::configure(array(
            'client_id' => $this->client_id,
            'auth_token' => $this->auth_token,
            'store_hash' => $this->store_hash
        ));
    }

    public function get_products($page, $category = false) {



        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';

        $headers = $this->buildEbayHeaders();



        $ch = curl_init();



        $params = "?page=" . $page . "&limit=50";





        if ($category !== false) {

            $params = "&categories:in=" . $category;
        }

        $api_url .= $params;

        // var_dump($api_url);

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

        return $result;
    }

    public function create_products_array_v3() {



        $count_products = ceil($this->get_products_count() / 50) + 1;



        $arr = array();

        for ($i = 1; $i < $count_products; $i++) {

            $prods = $this->get_products($i)->data;



            foreach ($prods as $product) {

                if (!empty($product)) {

                    $arr[$product->id]['name'] = $product->name;

                    $arr[$product->id]['sku'] = $product->sku;

                    $arr[$product->id]['is_visible'] = $product->is_visible;

                    $arr[$product->id]['availability'] = $product->availability;

                    $arr[$product->id]['upc'] = $product->upc;

                    $arr[$product->id]['price_hidden_label'] = $product->price_hidden_label;

                    $arr[$product->id]['is_price_hidden'] = $product->is_price_hidden;

                    $arr[$product->id]['price'] = $product->price;

                    $arr[$product->id]['cost_price'] = $product->cost_price;

                    $arr[$product->id]['retail_price'] = $product->retail_price;

                    $arr[$product->id]['sale_price'] = $product->sale_price;

                    $arr[$product->id]['categories'] = $product->categories;
                }
            }
        }

        print_r($product);

        return json_encode($arr);
    }

    public function update_products($data, $product_id) {



        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products/' . $product_id;

        $headers = $this->buildEbayHeaders();



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



        $result = json_decode($response);

        print_r($result);
    }

    public function create_products($data) {



        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products';

        $headers = $this->buildEbayHeaders();



        $data_string = json_encode($data);

        // var_dump(json_encode($data));exit();



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



        $result = json_decode($response);

        print_r($result);



        return $result;
    }

    

    public function bc_product_images($data = false, $product_id, $method) {

        $api_url = 'https://api.bigcommerce.com/stores/' . $this->store_hash . '/v3/catalog/products/' . $product_id . '/images';
        $headers = $this->buildEbayHeaders();
        $ch = curl_init();
        if ($data != false && $method == 'POST') {
            $data_string = json_encode($data);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
        }



        curl_setopt($ch, CURLOPT_URL, $api_url);

        curl_setopt($ch, CURLOPT_VERBOSE, 0);

        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);



        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

        //set the headers using the array of headers

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);



        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);



        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);



        $response = curl_exec($ch);



        $result = json_decode($response);

        if ($method == 'POST') {

            print_r($result);
        } else {

            return $result;
        }
    }

    private function buildEbayHeaders() {



        $headers = array(
            'X-Auth-Client: ' . $this->client_id,
            'X-Auth-Token: ' . $this->auth_token,
            'Content-Type: ' . 'application/json'
        );



        return $headers;
    }

    public function getBuyOrganicsOnlineProducts() {



        $count = Bigcommerce::getProductsCount();

        $arr = array();

        for ($i = 1; $i < $count / 50; $i++) {



            $filter = array("page" => $i, "limit" => 50);

            $products = Bigcommerce::getProducts($filter);



            foreach ($products as $product) {

                if (!empty($product)) {

                    // $arr[$product->id]['id'] = $product->id;

                    $arr[$product->id]['name'] = $product->name;

                    $arr[$product->id]['description'] = $product->description;

                    $arr[$product->id]['price'] = $product->price;

                    $arr[$product->id]['custom_url'] = $product->custom_url;

                    $arr[$product->id]['primary_image']['zoom_url'] = $product->primary_image->zoom_url;

                    $arr[$product->id]['primary_image']['thumbnail_url'] = $product->primary_image->thumbnail_url;

                    $arr[$product->id]['primary_image']['standard_url'] = $product->primary_image->standard_url;

                    $arr[$product->id]['primary_image']['tiny_url'] = $product->primary_image->tiny_url;
                }
            }
        }



        return response()->json($arr);
    }

    public function getBuyOrganicsOnlineSku() {



        $count = Bigcommerce::getProductsCount();

        $arr = array();

        for ($i = 1; $i < $count / 50 + 1; $i++) {



            $filter = array("page" => $i, "limit" => 50);

            $products = Bigcommerce::getProducts($filter);



            foreach ($products as $product) {

                if (!empty($product)) {

                    $arr[$product->id]['name'] = $product->name;

                    $arr[$product->id]['sku'] = $product->sku;

                    $arr[$product->id]['is_visible'] = $product->is_visible;

                    $arr[$product->id]['availability'] = $product->availability;

                    $arr[$product->id]['upc'] = $product->upc;
                }
            }
        }



        return json_encode($arr);
    }

    public function getDetailedProductsFromBoo() {



        $count = Bigcommerce::getProductsCount();

        $arr = array();

        for ($i = 1; $i < $count / 50 + 1; $i++) {



            $filter = array("page" => $i, "limit" => 50);

            $products = Bigcommerce::getProducts($filter);



            foreach ($products as $product) {

                if (!empty($product)) {

                    $arr[$product->id]['id'] = $product->id;

                    $arr[$product->id]['name'] = $product->name;

                    $arr[$product->id]['sku'] = $product->sku;

                    // $arr[$product->id]['description'] 		= $product->description;                    

                    $arr[$product->id]['is_visible'] = $product->is_visible;

                    $arr[$product->id]['availability'] = $product->availability;

                    $arr[$product->id]['upc'] = $product->upc;

                    $arr[$product->id]['retail_price'] = $product->retail_price;

                    $arr[$product->id]['cost_price'] = $product->cost_price;

                    $arr[$product->id]['price'] = $product->price;

                    $arr[$product->id]['sale_price'] = $product->sale_price;

                    $arr[$product->id]['calculated_price'] = $product->calculated_price;

                    $arr[$product->id]['type'] = $product->type;

                    $arr[$product->id]['inventory_level'] = $product->inventory_level;

                    $arr[$product->id]['weight'] = $product->weight;

                    $arr[$product->id]['date_created'] = $product->date_created;
                }
            }
        }



        return $arr;
    }

    public function get_products_by_category($category) {

        $count = Bigcommerce::getProductsCount();

        $arr = array();

        for ($i = 1; $i < $count / 50 + 1; $i++) {



            $filter = array("page" => $i, "limit" => 50);

            $products = Bigcommerce::getProducts($filter);



            foreach ($products as $product) {

                if (array_search($category, $product->categories)) {

                    $arr[$product->sku] = $product->id;
                }
            }
        }



        return json_encode($arr);
    }

    public function get_products_count() {



        return Bigcommerce::getProductsCount();
    }

    public function get_product($id) {



        return Bigcommerce::getProduct($id);
    }

    public function writeInJsonFile($input, $file_name) {



        $my_file = fopen($file_name . ".json", "w") or die("Unable to open file!");

        fwrite($myfile, json_encode($input));

        fclose($my_file);
    }

}
