<?php

use Bigcommerce\Api\Client as Bigcommerce;
// require 'BigCommerceSession.php';
require 'vendor/autoload.php';  
require 'config/database.php';
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

class OborneController
{
	private $product_status = array(
		'In Stock' 	   => 1, 
		'Out of Stock' => 0,
        'GST applies'  => 2
		);
	private $session;

	public function __controller(){}

    public function connect(){

        $auth_token = 'd9y2srla3treynpbtmp4f3u1bomdna2';
        $client_id = 'nvmcwck5yr15lob1q911z68d4r6erxy';
        $store_hash = 'hhhi';
        
        // $auth_token = 'b7t71a17qfarizmtp7lfsbgo5r2xq4h';
        // $client_id = '5x14d0x93z1vgaqbmvkzkf71xnu4mpf';
        // $store_hash = 'gp4zh1g248';
        $this->session = new BigCommerceSession($auth_token, $client_id, $store_hash);
        $this->session->configure_v2(); 
    }
    
    /**
     * Return an object. It contains the details of the products from Big Commerce.
     *
     * @param $url
     * @param $feed_type
     *
     * @return object
     */
    public function get_big_commerce_products($file){

        $boo_products = file_get_contents('http://buyorganicsonline.dev.nextlogic.ro/storage/' . $file. '.json');

        return json_decode($boo_products);
    }

    public function get_feed_oborne($url){

        $feed = file_get_contents($url);

        $rows = explode("\n", $feed);
        $products_feed = array();

        foreach($rows as $key => $row){
            $row1 = $row;
            $m = explode(",", $row1);

            $i = 0;
            $products_feed[$key]  = $m;  
        }

        unset($products_feed[0]);
        $s = array();
        foreach($products_feed as $key => $product){
                
                if($product[7] == 'Yes'){
                    $s[$product[1]] = 'disconnected';
                }
                else{
                    if($product[6] == 'In Stock'){
                        $s[$product[1]] = 'available';
                    }
                    else{
                        $s[$product[1]] = 'outofstock';
                    }
                }
        }   

        return $s;
    }
	
	public function main(){
		//Connect to Big Commerce
        $this->connect();

        // Update 'boo_file.json' with products from boo live
        // $this->update_products_json();exit();
        
        // Get Big Commerce products
        $bc_products = $this->get_big_commerce_products('boo_file');

		// Get Oborne
		$oborne = $this->get_oborne('oborne_new');

        // Merge feed1 with feed2
        $csv_products = $oborne;

        // Get the value of products regarding availability
        $products = $this->products_value($bc_products, $csv_products);

        // Get the type of product (e.g. available, deleted, inactive etc).
        // $types = $this->type_of_product($products[0]);

        //______________________________________________________
        // var_dump($oborne);
        // $this->filter_kadac($this->set_kad_from_csv());
        // $this->filter_kadac($this->set_kad_from_csv());
        // var_dump($this->set_kad_from_csv());
        // var_dump($this->set_kad_from_csv());

        //______________________________________________________

        // var_dump($bc_products);
        // var_dump($this->get_inactive_products($products[0]));
        // var_dump($this->get_discontinued_products($products[0]));
        
        // var_dump($this->get_deleted_products($products[0]));
        // var_dump($this->get_out_of_stock_products($products[0]));

        // var_dump($csv_products);exit();
        // $this->update_oborne($csv_products);exit();
        // $this->crucial_operation($products, $csv_products);
       
        $this->store_products($bc_products);
        // // echo 'seen';
        
        // $this->email();
 
        // fclose($this->myFile);
    }
    
    /**
     * Create an array which contains different kind of products as following:
     * $prods[0]: Matched products having details/status
     * $prods[1]: Products from supplier feed, not on buyorganicsonline.com.au
     * $prods[2]: Products where the key is an sKU and the value the ID from bigcommerce
     * $prods[3]: Products from boo matched with SKUs from supplier feeds.
     * $prods[4]: Unique products
     *
     * @param $bc_products    Products from buyorganicsonline.com.au
     * @param $csv_products   Products from supplier feeds
     * @param $checking_feed  Products which 
     *
     * @return $pr Array
     */
    public function products_value($bc_products, $csv_products){

        $prods = array();
        foreach($bc_products as $key => $item){
            $boo_products = Boo_product::find($key);
            
            $pos = strpos($item->sku, '-');
            if(($pos !== false) && (strpos($item->sku, '-') == strrpos($item->sku, '-'))){
                if(isset($csv_products[substr($item->sku, $pos + 2)])){

                    $prods[0][$item->sku]                = $csv_products[substr($item->sku, $pos + 2)];
                    $prods[2][$item->sku]                = $key;
                    $prods[3][$item->sku]                = substr($item->sku, $pos + 2);
                    $boo_products->stock_status          = $csv_products[substr($item->sku, $pos + 2)];
                    $boo_products->sku_supplier          = substr($item->sku, $pos + 2);
                    $boo_products->supplier              = substr($item->sku, 0, strpos($item->sku, '-') -1); 
                    $boo_products->status_update         = 0;
                    $boo_products->is_listed             = ($boo_products->id < 11372) ? 1: 0;  
                    // if(isset($checking_feed[substr($item->sku, $pos + 2)])){
                    //     $checking_feed[substr($item->sku, $pos + 2)]['exists_on_boo'] = 1;
                    // }
                    $boo_products->save();
                
                }else{
                 
                   $prods[1][] = $item->sku;
                }
            }else{

                if(isset($csv_products[$item->sku])){
                
                    $prods[0][$item->sku] = $csv_products[$item->sku];
                    // if(isset($checking_feed[$item->sku])){
                    //     $checking_feed[$item->sku]['exists_on_boo'] = 1;
                    // }
                
                }else{
                
                    $prods[1][] = $item->sku;
                
                }
            }
            
        }
        // $prods[4] = $checking_feed;
        return $prods;
    }

    public function store_products($products){

        foreach($products as $key => $prod){
            
            if(substr($prod->sku, 0, 2) == 'OB'){
                $product = new Oborne();

                $product->id                 = $prod->id;
                // $product->sku_supplier       = 
                $product->sku_boo            = $prod->sku;
                $product->price              = $prod->price;
                $product->barcode            = $prod->upc;
                // $product->stock_status       =
                // $product->exists_on_boo      = 
                $product->status_update      = 0;
                $product->is_visible         = $prod->is_visible;
                $product->availability       = $prod->availability;
                $product->price_hidden_label = $prod->price_hidden_label;
                $product->is_price_hidden    = $prod->is_price_hidden;
                $product->cost_price         = $prod->cost_price;
                $product->retail_price       = $prod->retail_price;
                $product->sale_price         = $prod->sale_price;

                $product->save();exit();
            }
        }
    }

    public function meta_feed($feed){

        foreach($feed as $id => $status){
            $feed[$id] = array(
                'status' => $status, 
                'exists_on_boo' => 0
                ); 
        }

        return $feed;
    }

	public function get_oborne($file = 'oborne'){
        
        // Feed having details
        $oborne = $this->get_feed_oborne('http://buyorganicsonline.dev.nextlogic.ro/storage/'. $file . '.csv');

        return $oborne;
    }

	public function update_oborne($products){

        $product_to_modified = array();
        $stats = array("N"              => 0,
                       "Y"              => 1, 
                       "available"      => 2,
                       "outofstock"     => 3, 
                       "discontinued"   => 4,
                       "deleted"        => 5
                       );

        foreach($products as $sku => $status){

            $boo_product = Boo_product::where('sku_supplier', $sku)->first();

            // var_dump(isset($boo_product->stock_status);exit();
            if(isset($boo_product->stock_status) && isset($stats[$boo_product->stock_status])){

                if($stats[$boo_product->stock_status] == 0){
                    if(!$this->is_set_unavailable($boo_product->id) && $boo_product->is_listed == 1){
                        $boo_product->status_update = 1;
                        $boo_product->save();
                    }
                }

                if($stats[$boo_product->stock_status] == 1 || $stats[$boo_product->stock_status] == 2){
                    if(!$this->is_set_available($boo_product->id) && $boo_product->is_listed == 1){
                        $boo_product->status_update = 2;
                        $boo_product->save();
                    }
                }

                if($stats[$boo_product->stock_status] == 3){
                    if(!$this->is_set_outofstock($boo_product->id)){
                        $boo_product->status_update = 3;
                        $boo_product->save();
                    }
                }

                if($stats[$boo_product->stock_status] == 4){
                    if(!$this->is_set_discontinued($boo_product->id)){
                        $boo_product->status_update = 4;
                        $boo_product->save();
                    }
                }

                if($stats[$boo_product->stock_status] == 5){
                    if(!$this->is_set_deleted($boo_product->id)){
                        $boo_product->status_update = 5;
                        $boo_product->save();
                    }
                }

            }
        }
	}
	
	public function crucial_operation($products, $csv_products){

        try{
            $this->set_availability_for_out_of_stock_products($products, $this->need_update_products(3));
            $this->set_visibility_for_discontinued_products($products, $this->need_update_products(4));
            $this->set_availability_for_available_products($products, $this->need_update_products(2));
            $txt = "[" . date("Y-m-d h:i:sa") ."] Success Oborne!\n";
            fwrite($this->myFile, $txt);
        }catch(Exception $e){
            $txt = "[" . date("Y-m-d h:i:sa") ."] Error updating products!\n";
            fwrite($this->myFile, $txt);
        }

        $this->update_oborne($csv_products);
	}
	
	public function need_update_products($status_update){

        $boo_products = Boo_product::where('status_update', $status_update)->get();
        $need_update = array();
        $stats = array( "N", "Y", "available", "outofstock", "discontinued", "deleted");

        foreach($boo_products as $product){
            $need_update[$product->sku_boo] = $stats[$status_update];

            $this->update_database_product($status_update, $product->id);
        }
        return $need_update;

	}
	
	public function update_database_product($status_update, $id){

        $pr = Boo_product::find($id);        

        if($status_update == 2){
            $pr->is_visible   = 1;
            $pr->availability = 'available'; 
            $pr->is_listed    = 1;
            $pr->price_hidden_label = '';
            $pr->is_price_hidden    = 0;
        }

        if($status_update == 3){
            $pr->price_hidden_label = 'This product is out of stock';
            $pr->is_price_hidden    = 1;
        }

        if($status_update == 4){
            $pr->is_visible          = 0;
            $pr->price_hidden_label = 'This product has been discontinued';
            $pr->is_price_hidden    = 1;
        }

        if($status_update == 5){
            $pr->is_visible          = 0;
            $pr->price_hidden_label = 'This product has been discontinued';
            $pr->is_price_hidden    = 1;
        }

        $pr->save();
    }
}