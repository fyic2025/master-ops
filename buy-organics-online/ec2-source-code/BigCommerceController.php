<?php



ini_set('max_execution_time', 300);



use Bigcommerce\Api\Client as Bigcommerce;

require 'BigCommerceSession.php';

require 'vendor/autoload.php';  

require 'config/database.php';

use Illuminate\Database\Capsule\Manager as Capsule;

use Illuminate\Support\Facades\Storage;

// include __DIR__ . 'database.php';



class BigCommerceController

{   

    private $start;

    private $myFile;

    private $session;

    private $feed1;

    private $feed2;

    private $suppliers = array(

        'OF'       => 'Organic Formulations', 

        'AUS'      => 'Ausganica',

        'UN1'      => 'UHP',

        'UN'       => 'UHP',

        'KAD'      => 'Kadac',

        'OB'       => 'Oborne', 

        'EUCO'     => 'Eucoclean',

        'SKIN'     => 'SkinB7',

        'IPDC'     => 'IPDC',

        'COCO'     => 'Coconut Tree',

        'IN'       => 'Integria Health',

        'AN'       => 'Ahoy Nuts',

        'EDEN'     => 'Eden Health Foods',

        'RS'       => 'RosenSerien',

        'SG'       => 'Soap Guru',

        'TOP'      => 'Table of Plenty',

        'TP'       => 'Table of Plenty',

        'TEELIXIR' => 'Teelixir'

        );



    /**

    * Establish connection to BigCommerce.

    *

    **/

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

     * Return an array. It contains the details of the products from the CSV feed.

     *

     * @param $url

     * @param $feed_type: '1' - UHP, '2' - The other one

     *

     * @return array

     */

    public function get_feed_products($url, $feed_type){



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

            foreach($product as $key1 => $att){

                if($feed_type == 1){

                    if($key1 == 9){

                        $s[$product[0]] = $att;

                    }

                }else{

                    if($key1 == 10){

                        $s[substr($product[0], 1, -1)] = substr($att, 1, -1);

                    }

                }

            }

        }   



        return $s;

    }



    public function get_feed_product_details($url, $weight = false){



        $feed = file_get_contents($url);



        $rows = explode("\n", $feed);

        $products_feed = array();



        foreach($rows as $key => $row){

            $row1 = $row;

            $m = explode(",", $row1);

            $i = 0;

            $products_feed[$key]  = $m;  

        }

        // var_dump($products_feed);exit();

        unset($products_feed[0]);

        $s = array();

        foreach($products_feed as $key => $product){

            // var_dump($product);exit();

            foreach($product as $key1 => $att){

               

                if($weight == false){

                    $s[$product[0]][] = $att;

                }else{

                    if($key1>0){

                    $s[$product[0]][] = $att;

                    }

                }

            }

        }   



        return $s;

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



    // Update json file from storage with the current listed products from buyorganisconline.com.au

    public function update_products_json(){



        $this->connect();

        $file_name = 'boo_file.json';



        $products_json = $this->session->create_products_array_v3();

        $this->store_json_file($products_json, $file_name);

        // var_dump($this->session->get_products_count());

    }



    public function csv_boo_products(){



        $this->connect();



        $products_json = $this->session->getDetailedProductsFromBoo();

        

        // output headers so that the file is downloaded rather than displayed

        header('Content-Type: text/csv; charset=utf-8');

        header('Content-Disposition: attachment; filename=data.csv');



        // create a file pointer connected to the output stream

        $output = fopen('php://output', 'w');



        // output the column headings

        fputcsv($output, array('id', 'name', 'sku', 'is_visible', 'availability', 'upc', 'retail_price', 'cost_price', 'price', 'sale_price', 'calculated_price', 'type', 'weight', 'date_created'));



        foreach($products_json as $key => $product){

            $line = array($key, $product);

            fputcsv($output, $product);

        }

    }



    /**

     * Create a downloadable CSV link having the products from buyorganicsonline.com.au matching with the products from supplier feeds

     *

     * @param $bc_products  All products listed from buyorganicsonline.com.au

     * @param $csv_products  All products listed from supplier feeds (from CSVs)

     *

     * @return Downloadable CSV

     */

    public function matching_products($bc_products, $csv_products){



        // output headers so that the file is downloaded rather than displayed

        header('Content-Type: text/csv; charset=utf-8');

        header('Content-Disposition: attachment; filename=data.csv');



        // create a file pointer connected to the output stream

        $output = fopen('php://output', 'w');



        // output the column headings

        fputcsv($output, array('live_sku', 'feed_sku'));



        // loop over the rows, outputting them

        $boo_products = $this->products_value($bc_products, $csv_products)[3];

        foreach($boo_products as $key => $product){

            $line = array($key, $product);

            // foreach($product as $element){

            //  $line[] = $element;

            // }

            fputcsv($output, $line);

        }

    }



    /**

     * Create a downloadable CSV link having the products from buyorganicsonline.com.au NOT matching with the products from supplier feeds

     *

     * @param $bc_products  All products listed from buyorganicsonline.com.au

     * @param $csv_products  All products listed from supplier feeds (from CSVs)

     *

     * @return Downloadable CSV

     */

    public function non_matching_products($bc_products){



        // output headers so that the file is downloaded rather than displayed

        header('Content-Type: text/csv; charset=utf-8');

        header('Content-Disposition: attachment; filename=data.csv');



        // create a file pointer connected to the output stream

        $output = fopen('php://output', 'w');



        // output the column headings

        fputcsv($output, array('sku', 'brand', 'description', 'size', 'gst', 'wholesale', 'rrp', 'percarton', 'cartononly', 'barcode', 'stockstatus', 'image_url'));

        // var_dump($bc_products);exit();

        // loop over the rows, outputting them

        unset($bc_products[0]);

        $pr = array();

        foreach($bc_products as $sku => $product){

            if($product['exists_on_boo'] == 0){

                $line = array();

                if(substr($product['status'][10],1,-1) == 'available'){

                    foreach($product['status'] as $prod){

                        if(strpos($prod, "\"") !== false){

                            $line[] = substr($prod, 1, -1);

                        }

                        else

                        {

                            $line[] = $prod;

                        }

                        

                    }

                    // var_dump($line);   



                    fputcsv($output, $line);      

                }         

            }

        }

            // fputcsv($output, $bc_products);

        // var_dump($bc_products);



    }



    public function get_unique_feed_products($boo_products){



        $wrong_elements = array(

                'HAN48' => true, 

                'NS13'=> true,

                'NK11'=> true,

                'KR15'=> true,

                'JC11'=> true,

                'HAN34'=> true,

                'VE11'=> true,

                'AEFD'=> true,

                'HAN53'=> true,

                'HAN54'=> true,

                'EL82'=> true,

                'VE01'=> true,

                'AOCD'=> true,

                'XB01'=> true,

                'XB02'=> true,

                'XB03'=> true,

                'XB11'=> true,

                'XB12'=> true,

                'XB13'=> true,

                'PM33'=> true,

                'PM43'=> true,

                'SU09'=> true,

                'MM51'=> true,

                'MM52'=> true,

                'SU11'=> true,

                'CLIF56'=> true,

                'CW21'=> true,

                'CW22'=> true,

                'CW23'=> true,

                'CW24'=> true,

                'CW25'=> true,

                'CW26'=> true,

                'PM03'=> true,

                'PM13'=> true,

                'EC10'=> true,

                'NA91'=> true,

                'NA92'=> true,

                'NA93'=> true,

                'NA94'=> true,

                'NA95'=> true,

                'NA96'=> true,

                'GG14'=> true,

                'PK12'=> true,

                'PK11'=> true,

                'CLIF65'=> true,

                'AE76'=> true,

                'PT170'=> true,

                'PT171'=> true,

                'KG01'=> true,

                'JJ44'=> true,

                'FD32'=> true,

                'EC61'=> true,

                'EC62'=> true,

                'EC63'=> true,

                'EC64'=> true,

                'ARCD'=> true,

                'BB3TD'=> true,

                'BBBCD'=> true,

                'BBFD'=> true,

                'BBTD'=> true,

                'BDCD'=> true,

                'BDFCD'=> true,

                'BDFD'=> true,

                'CHRCD'=> true,

                'CLIFP27'=> true,

                'CLIFP31'=> true,

                'CLIFP37'=> true,

                'BO20'=> true,

                'BO21'=> true,

                'DCDD'=> true,

                'DCFD2'=> true,

                'DCSD'=> true,

                'DCTD'=> true,

                'ESFD'=> true,

                'BO05'=> true,

                'BO01'=> true,

                'BO04'=> true,

                'GGFD'=> true,

                'GGHB'=> true,

                'HANCD'=> true,

                'JJBC'=> true,

                'JJFD'=> true,

                'BO08'=> true,

                'MMFD'=> true,

                'NTCD'=> true,

                'NTFD'=> true,

                'OLCD'=> true,

                'PFCD'=> true,

                'SJ03'=> true,

                'SJ04'=> true,

                'PSFBBCD'=> true,

                'PWECD'=> true,

                'PWFD1'=> true,

                'PWFDH'=> true,

                'SECD'=> true,

                'SJ05'=> true,

                'SJ02'=> true,

                'VBSS'=> true,

                'SJ01'=> true,

                'VOGFW'=> true,

                'WN31CD'=> true,

                'WN34CD'=> true,

                'WN40CD'=> true,

                'WNCS'=> true,

                'WNSD'=> true,

                'EU04' =>true,

                'EU05' => true,

                'WO02' => true,

                'FH05' => true

                );



        $pr = array();

        foreach($boo_products as $sku => $product){

             if(!isset($wrong_elements[$sku])){

                if($product['exists_on_boo'] == 0){

                    if($product['status'][9] == 'Y'){

                        fputcsv($output, $product['status']);

                    }               

                }

            }

        }



        return $pr;

    }



    public function unique_feed_products($boo_products){



        $wrong_elements = array(

                'HAN48' => true, 

                'NS13'=> true,

                'NK11'=> true,

                'KR15'=> true,

                'JC11'=> true,

                'HAN34'=> true,

                'VE11'=> true,

                'AEFD'=> true,

                'HAN53'=> true,

                'HAN54'=> true,

                'EL82'=> true,

                'VE01'=> true,

                'AOCD'=> true,

                'XB01'=> true,

                'XB02'=> true,

                'XB03'=> true,

                'XB11'=> true,

                'XB12'=> true,

                'XB13'=> true,

                'PM33'=> true,

                'PM43'=> true,

                'SU09'=> true,

                'MM51'=> true,

                'MM52'=> true,

                'SU11'=> true,

                'CLIF56'=> true,

                'CW21'=> true,

                'CW22'=> true,

                'CW23'=> true,

                'CW24'=> true,

                'CW25'=> true,

                'CW26'=> true,

                'PM03'=> true,

                'PM13'=> true,

                'EC10'=> true,

                'NA91'=> true,

                'NA92'=> true,

                'NA93'=> true,

                'NA94'=> true,

                'NA95'=> true,

                'NA96'=> true,

                'GG14'=> true,

                'PK12'=> true,

                'PK11'=> true,

                'CLIF65'=> true,

                'AE76'=> true,

                'PT170'=> true,

                'PT171'=> true,

                'KG01'=> true,

                'JJ44'=> true,

                'FD32'=> true,

                'EC61'=> true,

                'EC62'=> true,

                'EC63'=> true,

                'EC64'=> true,

                'ARCD'=> true,

                'BB3TD'=> true,

                'BBBCD'=> true,

                'BBFD'=> true,

                'BBTD'=> true,

                'BDCD'=> true,

                'BDFCD'=> true,

                'BDFD'=> true,

                'CHRCD'=> true,

                'CLIFP27'=> true,

                'CLIFP31'=> true,

                'CLIFP37'=> true,

                'BO20'=> true,

                'BO21'=> true,

                'DCDD'=> true,

                'DCFD2'=> true,

                'DCSD'=> true,

                'DCTD'=> true,

                'ESFD'=> true,

                'BO05'=> true,

                'BO01'=> true,

                'BO04'=> true,

                'GGFD'=> true,

                'GGHB'=> true,

                'HANCD'=> true,

                'JJBC'=> true,

                'JJFD'=> true,

                'BO08'=> true,

                'MMFD'=> true,

                'NTCD'=> true,

                'NTFD'=> true,

                'OLCD'=> true,

                'PFCD'=> true,

                'SJ03'=> true,

                'SJ04'=> true,

                'PSFBBCD'=> true,

                'PWECD'=> true,

                'PWFD1'=> true,

                'PWFDH'=> true,

                'SECD'=> true,

                'SJ05'=> true,

                'SJ02'=> true,

                'VBSS'=> true,

                'SJ01'=> true,

                'VOGFW'=> true,

                'WN31CD'=> true,

                'WN34CD'=> true,

                'WN40CD'=> true,

                'WNCS'=> true,

                'WNSD'=> true,

                'EU04' =>true,

                'EU05' => true,

                'WO02' => true,

                'FH05' => true

                );

        // output headers so that the file is downloaded rather than displayed

        header('Content-Type: text/csv; charset=utf-8');

        header('Content-Disposition: attachment; filename=data.csv');



        // create a file pointer connected to the output stream

        $output = fopen('php://output', 'w');



        // output the column headings

        fputcsv($output, array('SKU', 'Brand', 'Description', 'Size', 'RRP', 'Tax', 'Price', 'Percarton', 'Barcode', 'Is_active'));



        // loop over the rows, outputting them

        // $boo_products = $this->products_value($bc_products, $csv_products, $this->meta_feed($csv_products))[4];

        foreach($boo_products as $sku => $product){

             if(!isset($wrong_elements[$sku])){

                if($product['exists_on_boo'] == 0){

                    if($product['status'][9] == 'Y'){

                        fputcsv($output, $product['status']);

                    }               

                }

            }

        }

    }



    public function store_json_file($data, $file_name){



        Storage::disk('public')->put($file_name, $data);

    }



    public function main(){





        // var_dump("asd");exit();

        //Connect to Big Commerce

        $this->connect();



        // Get Big Commerce products

        $bc_products = $this->get_big_commerce_products('boo_file');



        // Get CSV_1 products

        $feed1 = $this->get_feed_products('http://shop.uhp.com.au/uhp_products_export.php?format=csv&accno=10386&cuid=BUYORO0102', 1);



  //       // // Feed1 having details

  //       // $feed2 = $this->get_feed_product_details('https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv');



  //       //Get CSV_2 products

        $feed2 = $this->get_feed_products('https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv', 2);



        // Merge feed1 with feed2

        $csv_products = $feed2;



        // Get Oborne

        $oborne = $this->get_oborne('oborne_new');

        $products1 = $this->products_value($bc_products, $oborne, $this->meta_feed($oborne));



        // Get the value of products regarding availability

        $products = $this->products_value($bc_products, $csv_products, $this->meta_feed($csv_products));



        // Get the type of product (e.g. available, deleted, inactive etc).

        $types = $this->type_of_product($products[0]);



        // $boo2 = $this->get_big_commerce_products('boo2');



        // $products2 = $this->products_value($boo2, $csv_products);



        $un_elements = $this->select_UN_products_from_feed1($products[0]);



        //____________



        $this->myFile = fopen("update_activity.txt", "a") or die("Unable to open file!");

        



        //__OBORNE_________



        // Gst Status

        // $oborne_gst = $this->get_oborne('oborne_new', true);

        // $this->update_gst_oborne_live($oborne_gst);

        // var_dump($oborne_gst);exit();

        // $this->update_gst_oborne_database($oborne_gst);



        //Email Oborne

        // $this->email();



        //__________________



        //Display

        // var_dump($products[0]);

        // var_dump($this->get_valide_products($products[0]));



        // $this->matching_products($bc_products, $csv_products);

        // $this->non_matching_products($bc_products, $csv_products);



        // var_dump($this->get_valide_products($products[0]));

        // 

        // var_dump($this->get_uhp_from_unmatched_products($products[1]));

        // var_dump($this->is_alpha_regex('AS'));





        // var_dump($bc_products);        



        // $this->log_time();



        //       $this->connect();

        // $array = array(373, 1221);

        // $fields = array(

       //        "price_hidden_label"  => 'Unavailable',

       //        "is_price_hidden"     => true

       //                );

       //    // var_dump((integer)$products[2][$sku]);

       //    Bigcommerce::updateProduct(197, $fields);

        //      // $cat = array(1,2,3);

        //      // $this->attach_new_category($cat, 4);

        //      // var_dump($products[0]);

        // var_dump($this->session->get_product(8305));



        //________________________________________________________________________________________

        // $unmached_uhp_products = $this->get_uhp_from_unmatched_products($products[1]);

     

        // $uhp_unmached_products_splitted = array_merge($this->split_composed_skus($unmached_uhp_products[1]), $this->remove_excedent_from_composed_skus($unmached_uhp_products[0]));

    

        // $unmatched = $this->products_value(array_merge((array)$bc_products, $uhp_unmached_products_splitted), $csv_products, $this->meta_feed($csv_products));

        

        // var_dump($this->get_unique_feed_products($unmatched[4]));    



        //________________________________________________



        // Unique products having details

        // $unique = $this->get_feed_product_details('http://buyorganicsonline.dev.nextlogic.ro/storage/data1.csv', true);



        // $x = $this->set_weight($this->get_unique_feed_products($unmatched[4]), $unique);

        // var_dump($unmatched[4]);exit();



        // $this->push_unmached_products_uhp_on_bigcommerce_live($x);s

        

        //______________________________________

        

        // $pr = $this->session->get_products_count();

        // $attributes = $this->set_attributes($this->get_unique_feed_products($unmatched[4]), $unique);

        // var_dump($attributes);

        // $this->set_attributes($unique);  

        // var_dump($this->set_attributes($unique));   



        //________________________________________________________________________________________________



        // $kad_elements = $this->select_KAD_products_from_feed($products[0]);



        // var_dump($kad_elements);

        // var_dump($feed2);

        // var_dump($products[4]);

        // $this->non_matching_products($products[4]);



        //______________________________________________________

        // var_dump($this->set_oborne());

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

        // $this->store_products($bc_products);

        // // echo 'seen';



        //LIVE_Kadac____________________

        $this->update_kadac($csv_products);

        $this->crucial_operation($products, $csv_products);



        //LIVE_Oborne___________________

        // $this->update_kadac($oborne);

        // $this->crucial_operation($products1, $oborne, true);

       

        fclose($this->myFile);



    }



    public function update_gst_oborne_database($products){



        

        foreach($products as $sku => $gst){

            

            $boo_product = Boo_product::where('sku_supplier', $sku)->first();

            // var_dump($boo_product->gst_status);exit();

            if (isset($boo_product)){ 

                $boo_product->gst_status = $gst;

                $boo_product->save();

            }

        }



    }



    public function update_gst_oborne_live($products){



        foreach($products as $sku => $gst){

            

            $boo_product = Boo_product::where('sku_supplier', $sku)->first();

            $x = $gst == 1 ? 0 : 1;



            $fields = array(

                "tax_class_id"  => $x

                        );

            Bigcommerce::updateProduct($boo_product->id, $fields);

        }

    }



    public function get_oborne($file = 'oborne', $gst = false){

        

        // Feed having details

        if($gst === false){

            $oborne = $this->get_feed_status('http://buyorganicsonline.dev.nextlogic.ro/storage/'. $file . '.csv');

        }else{

            $oborne = $this->get_oborne_gst('http://buyorganicsonline.dev.nextlogic.ro/storage/'. $file . '.csv');

            

        }

        return $oborne;

    }



    public function get_feed_status($url){



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

                

                if(isset($product[7]) && $product[7] == 'Yes'){

                    $s[$product[1]] = 'discontinued';

                }

                else{

                    if(isset($product[6]) && $product[6] == 'In Stock'){

                        $s[$product[1]] = 'available';

                    }

                    else{

                        if(isset($product[1])){

                            $s[$product[1]] = 'outofstock';

                        }

                    }

                }

        }   



        return $s;

    }



    public function get_oborne_gst($url){



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

                

                if(isset($product[5]) && $product[5] == 'GST applies'){

                    $s[$product[1]] = 1;

                }

                else{

                    if(isset($product[1])){

                        $s[$product[1]] = 0;                        

                    }

                }

        }   



        return $s;

    }



    public function crucial_operation($products, $csv_products, $oborne = false){



        $need_update = $this->need_update_products();

        

        //outofstock

        try{

            

            $this->set_availability_for_out_of_stock_products($products, $need_update[3]);

            if($oborne === false){

                $txt = "[" . date("Y-m-d h:i:sa") ."] Success outofstock products Kadac!\n";

            }

            else{

                $txt = "[" . date("Y-m-d h:i:sa") ."] Success outofstock products Oborne!\n";

            }

            

            fwrite($this->myFile, $txt);

        }catch(Exception $e){

            $txt = "[" . date("Y-m-d h:i:sa") ."] Error updating products!\n";

            fwrite($this->myFile, $txt);

        }



        //discontinued

        try{



            $this->set_visibility_for_discontinued_products($products, $need_update[4]);

            if($oborne === false){

                $txt = "[" . date("Y-m-d h:i:sa") ."] Success discontinued products Kadac!\n";

            }

            else{

                $txt = "[" . date("Y-m-d h:i:sa") ."] Success discontinued products Oborne!\n";

            }

            

            fwrite($this->myFile, $txt);



        }catch(Exception $e){

            $txt = "[" . date("Y-m-d h:i:sa") ."] Error updating products!\n";

            fwrite($this->myFile, $txt);

        }



        //available

        try{



            $this->set_availability_for_available_products($products, $need_update[2]);

            if($oborne === false){

                $txt = "[" . date("Y-m-d h:i:sa") ."] Success available products Kadac!\n";

            }

            else{

                $txt = "[" . date("Y-m-d h:i:sa") ."] Success available products Oborne!\n";

            }

            

            fwrite($this->myFile, $txt);



        }catch(Exception $e){

            $txt = "[" . date("Y-m-d h:i:sa") ."] Error updating products!\n";

            fwrite($this->myFile, $txt);

        }

        

        $this->update_kadac($csv_products);

    }



    public function is_set_unavailable($id){



        $product = Boo_product::find($id);



        if($product->availability == 'disabled' && $product->is_listed == 1){

            return 1;

        }

        return 0;

    }



    public function is_set_available($id){



        $product = Boo_product::find($id);

        // var_dump($product->id);exit();

        if($product->is_visible == 1 && $product->availability == 'available' && $product->is_listed == 1 && $product->price_hidden_label == '' && $product->is_price_hidden == 0){

            return 1;

        }

        return 0;

    }



    public function is_set_outofstock($id){



        $product = Boo_product::find($id);



        if($product->price_hidden_label == 'This product is out of stock' && $product->is_price_hidden == 1){

            return 1;

        }

        return 0;

    }



    public function is_set_deleted($id){



        $product = Boo_product::find($id);



        if($product->is_visible == 0 && $product->price_hidden_label == 'This product has been discontinued' && $product->is_price_hidden == 1){

            return 1;

        }

        return 0;

    }



    public function is_set_discontinued($id){



        $product = Boo_product::find($id);



        if($product->is_visible == 0 && $product->price_hidden_label == 'This product has been discontinued' && $product->is_price_hidden == 1){

            return 1;

        }

        return 0;

    }



    public function need_update_products(){



        $boo_products = Boo_product::where('status_update', 2)

                                    ->orWhere('status_update', 3)

                                    ->orWhere('status_update', 4)

                                    ->get();

        $need_update = array();

        $stats = array( "N", "Y", "available", "outofstock", "discontinued", "deleted");



        foreach($boo_products as $product){

            $need_update[$product->status_update][$product->sku_boo] = $stats[$product->status_update];



            $this->update_database_product($product->status_update, $product->id);

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



    public function update_kadac($products){



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



    public function store_products($products){



        foreach($products as $key => $prod){

            

            $product = new Boo_product();



            $product->id                 = $key;

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



            $product->save();

        }

    }



    public function add_images(){

        $prodss = array();

        for($i = 1; $i < 13; $i++){

            $prods = $this->session->get_products($i, 1218)->data;

            // var_dump($prods);exit();

            foreach($prods as $prod){

                $sku = explode(" ", $prod->sku);

                if(isset($sku[2])){

                    $image = $unique[$sku[2]][12];

                }   

                else{

                    $image = $unique[$sku[0]][12];

                }   

                $product_id = $prod->id;

                $data = array("image_url" => $image);

                // var_dump($product_id, $image, $sku);

                $product_images_number = $this->session->bc_product_images(false, $product_id, 'GET')->meta->pagination->total;      

                if($product_images_number == 0){

                    $this->session->bc_product_images($data, $product_id, 'POST');

                }                     

            }     

        }

    }


    public function filter_kadac($products){

        

        unset($products[""]);

        // var_dump($products);exit();

        foreach($products as $product){

            $data = array(

            "sku"           => "KAD - " . $product[0],

            "categories"    => [1217],

            "type"          => "physical",

            "weight"        => $product[5],

            "upc"           => $product[13],

            "is_visible"    => false,

            "availability"  => 'disabled'

            );



            if(empty($product[8])){

                $data['price']          = $product[9];

                $data['retail_price']   = $product[9];

                $data['cost_price']     = $product[7];

                $data['name']           = $product[2] . $product[3];

                $data['title']          = $product[2] . $product[3];

            }

            else

            {

                $data['price']          = $product[10];

                $data['retail_price']   = $product[10];

                $data['cost_price']     = $product[8];

                $data['name']           = $product[2] . ' ' . $product[4] . $product[3];

                $data['title']          = $product[2] . ' ' . $product[4] . $product[3];

            }

            // print_r(substr($product[15],1,-4) . "<br>");

            // var_dump($data);exit();

            $prod_id = $this->session->create_products($data)->data->id;

            $this->session->bc_product_images(array("image_url" => substr($product[15],1,-4)), $prod_id, 'POST');

            // var_dump($product);

            // exit();

        }

    }







    public function push_unmached_products_uhp_on_bigcommerce_live($products){



        foreach($products as $product){

            $data = array(

                "name" => substr($product[2],1,-1),

                "title" => substr($product[2],1,-1),

                "sku" => "UN - " . $product[0],

                "retail_price" => $product[4],

                "price" => $product[4],

                "cost_price" => $product[6],

                "categories" => [1218],

                "type" => "physical",

                "weight" => isset($product[22]) ? $product[22] : 0,

                "upc" => $product[8],

                "is_visible" => false,

                "availability" => 'disabled'

                );

            $this->session->create_products($data);

        }

    }



    public function set_attributes($unique){

        $headers = array('Certified Organic', 'Organic Ingredients', 'Gluten Free', 'Dairy Free', 'Vegetarian', 'Vegan Friendly', 'Sulphate Free', 'Fairtrade', 'New Product');

        $prodss = array();

        for($i = 4; $i < 13; $i++){

                $prods = $this->session->get_products($i, 1218)->data;

            //     // var_dump($prods);exit();

                foreach($prods as $prod){



                    $attributes = "Product Attribute: \n";

                    $sku = explode(" ", $prod->sku);

                    if(isset($sku[2])){

                        $attributes .= ($unique[$sku[2]][13] == 'Y') ? $headers[0] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][14] == 'Y') ? $headers[1] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][15] == 'Y') ? $headers[2] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][16] == 'Y') ? $headers[3] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][17] == 'Y') ? $headers[4] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][18] == 'Y') ? $headers[5] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][19] == 'Y') ? $headers[6] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][20] == 'Y') ? $headers[7] . "<br>" : "<br>";

                        $attributes .= ($unique[$sku[2]][21] == 'Y') ? $headers[8] . "<br>" : "<br>";

                    }   

                    else{

                        $attributes .= ($unique[$sku[0]][13] == 'Y') ? $headers[0] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][14] == 'Y') ? $headers[1] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][15] == 'Y') ? $headers[2] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][16] == 'Y') ? $headers[3] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][17] == 'Y') ? $headers[4] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][18] == 'Y') ? $headers[5] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][19] == 'Y') ? $headers[6] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][20] == 'Y') ? $headers[7] . '\n' : '\n';

                        $attributes .= ($unique[$sku[0]][21] == 'Y') ? $headers[8] . '\n' : '\n';

                    }   

                    $product_id = $prod->id;

                    

                    if(!empty($prod->description) && strpos($prod->date_modified, '2018-04-19T17') === false){

                        $attributes = $prod->description . "<br>" . $attributes;

                    }

                    $data = array("description" => $attributes);

                    // var_dump($prod->id, $data);

                    // var_dump($product_id, $image, $sku);

                    $this->session->update_products($data, $product_id);                       

                }    

                // exit();

        }

    }



    public function set_weight($products, $unique){

        foreach($products as $key => $product){

            if(isset($unique[$product[0]])){

                $products[$key][] =  $unique[$product[0]][7];

            }

        }





        return $products;

    }



    public function is_alpha_regex($string){



        if(preg_match('/[^a-z]/i', $string))

            return 0;

        return 1; 

    }



    public function is_alphanumeric_regex($string){



        if(preg_match('/[^a-z0-9.]/i', $string))

            return 0;

        return 1; 

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



    public function remove_excedent_from_composed_skus($products){



        $pr = array();

        foreach($products as $product){

            

            $pieces = explode(" ", $product);

            foreach($pieces as $piece){

                if(!$this->is_alpha_regex($piece) && $this->is_alphanumeric_regex($piece)){

                    if(substr($piece,-1) == '.'){

                        $object = (object)array('sku' => substr($piece,0,-1));

                        $pr[] = $object;

                    }

                    else{

                        $object = (object)array('sku' => $piece);

                        $pr[] = $object;

                    }

                }

            }

        }



        return $pr;

    }



    public function set_oborne(){

        

        // Feed having details

        $oborne = $this->get_feed_product_details('http://buyorganicsonline.dev.nextlogic.ro/storage/oborne.csv');



        return $oborne;

    }



    public function set_kad_from_csv(){



        // Feed having details

        $kadac_products = $this->get_feed_product_details('http://buyorganicsonline.dev.nextlogic.ro/storage/kadac_revised.csv');



        return $kadac_products;



    }

    /**

     * Split in composed SKUs

     *

     * @param $products  

     *

     * @return $pr array: Contains SKUs 

     */

    public function split_composed_skus($products){



        $pr = array();

        foreach($products as $product){



            $pieces = explode(" ", $product);

            foreach($pieces as $piece){

                if(!$this->is_alpha_regex($piece) && $this->is_alphanumeric_regex($piece)){

                    $object = (object)array('sku' => $piece);



                    $pr[] = $object;

                }

            }



        }

        return $pr;

    }



    /**

     * Create an array which contains the unmached products from UHP

     *

     * @param $products  All unmatched products

     *

     * @return $pr Array: $pr[0] has the simple SKUs, while $pr[1] has the composed SKUs 

     */

    public function get_uhp_from_unmatched_products($products){



        $pr = array();

        foreach($products as $sku){

            if(strpos($sku, "UN ") !== false  && strpos($sku, "Copy") === false && strpos($sku, "&") === false){

                $pr[0][] = $sku;

            }



            if(strpos($sku, "&") !== false && strpos($sku, "UN ") !== false  && strpos($sku, "Copy") === false){

                $pr[1][] = $sku;



            }

        }



        return $pr;

    }



    public function attach_new_category(&$categories, $new_category){



        $categories[] = $new_category;

    }



    public function update_product_categories($new_categories, $product_id){

        

        $fields = array(

            "categories"  => $new_categories

                    );

      

        Bigcommerce::updateProduct($product_id, $fields);

    }



    public function get_product_categories($product_id){



        return $this->session->get_product($product_id)->categories;

    }



    public function set_visibility_for_feed1($products, $feed1_products){



        // Set is_visible = false if the product is not available

        $unavailable_products = $this->get_inactive_products($feed1_products);

        foreach($unavailable_products as $sku => $product){

            $fields = array(

            "is_visible"  => "false"

                    );

            // var_dump((integer)$products[2][$sku]);

            Bigcommerce::updateProduct((integer)$products[2][$sku], $fields);

            // exit();

        }

    }



    public function select_KAD_products_from_feed($elements){



        $kad_elements = array();

        foreach($elements as $key => $value){

            if(strpos($value, "KAD ") !== false  && strpos($value, "Copy") === false && strpos($value, "&") === false){

                $kad_elements[0][] = $value;

            }



            if(strpos($value, "&") !== false && strpos($value, "KAD ") !== false  && strpos($value, "Copy") === false){

                $kad_elements[1][] = $value;

            }



        }

        return $kad_elements;

    }



    public function select_UN_products_from_feed1($elements){



        // var_dump($elements);exit();

        $un_elements = array();

        foreach($elements as $key => $value){

            if(strpos($key, "UN -") !== false){

                $un_elements[$key] = $value;

            }

        }

        return $un_elements;

    }



    // How many elements are duplicated

    public function check_arrays($array1, $array2){

        $elements = array();

        $dif = array();

        foreach($array2 as $key => $x){

            $pos = strpos($key, '-');

            $copy_pos = strpos($key, 'Copy');

            if(isset($array1[substr($key, $pos + 2)]) && $copy_pos === false){

                if(isset($elements[substr($key, $pos + 2)])){

                    $dif[substr($key, $pos + 2)] = $key;

                }else{

                    $elements[$key] = $x;

                }

            }

            // else{

            //     $elements['fara_liniuta'][] = $key;

            // }

        }

        return $elements;

    }



    public function set_availability_for_available_products($products, $need_update){



        // Set availability = disabled if the product is out of stock

        $available_products = $need_update;

        // var_dump($outOfStockProducts);exit;

        foreach($available_products as $sku => $product){

            $fields = array(

            "is_visible"       => true,

            "availability"     => 'available',

            "price_hidden_label"  => '',

            "is_price_hidden"     => false,

                    );



            Bigcommerce::updateProduct((integer)$products[2][$sku], $fields);



        }

        $txt = "[" . date("Y-m-d h:i:sa") ."] Available products updated!\n";

        fwrite($this->myFile, $txt);

    }



    public function set_visibility_for_discontinued_products($products, $need_update){



        // Set is_visible = false if the product is discontinued

        // $discontinued_products = $this->get_discontinued_products($products[0]);

        $discontinued_products = $need_update;

        foreach($discontinued_products as $sku => $product){



            $id = (integer)$products[2][$sku];

            $categories = $this->get_product_categories($id);

            $check_before_removing_category = 1221; // the id of category listed on buyorganicsonline.com.au 

            $this->attach_new_category($categories, $check_before_removing_category);

            $empty_categories = array($check_before_removing_category);





            $fields = array(

            "is_visible"          => false,

            "price_hidden_label"  => 'This product has been discontinued',

            "is_price_hidden"     => true,

            "categories"          => $empty_categories

                    );

            // var_dump((integer)$products[2][$sku]);

            Bigcommerce::updateProduct($id, $fields);

        }

        $txt = "[" . date("Y-m-d h:i:sa") ."] Discontinued products updated!\n";

        fwrite($this->myFile, $txt);

    }



    public function set_availability_for_out_of_stock_products($products, $need_update){



        // Set availability = disabled if the product is out of stock

        // $outOfStockProducts = $this->get_out_of_stock_products($products[0]);

        $outOfStockProducts = $need_update;

        // var_dump($outOfStockProducts);exit;

        foreach($outOfStockProducts as $sku => $product){

            $fields = array(

            "price_hidden_label"  => 'This product is out of stock',

            "is_price_hidden"     => true,

            "availability"        => 'disabled'

                    );

            // var_dump((integer)$products[2][$sku]);exit();

            Bigcommerce::updateProduct((integer)$products[2][$sku], $fields);

            

        }

        $txt = "[" . date("Y-m-d h:i:sa") ."] Out of stock products updated!\n";

        fwrite($this->myFile, $txt);

    }



    public function set_visibility_for_deleted_products($products){



        // Set is_visible field if the product is deleted

        $deleted_products = $this->get_deleted_products($products[0]);

        foreach($deleted_products as $sku => $product){



            $id = (integer)$products[2][$sku];

            $categories = $this->get_product_categories($id);

            $check_before_removing_category = 1221; // the id of category listed on buyorganicsonline.com.au 

            $this->attach_new_category($categories, $check_before_removing_category);

            $empty_categories = array($check_before_removing_category);



            $fields = array(

            "is_visible"          => false,

            "price_hidden_label"  => 'This product has been discontinued',

            "is_price_hidden"     => true,

            "categories"          => $empty_categories ,

            "availability"        => 'disabled'

                    );

            // var_dump((integer)$products[2][$sku]);

            Bigcommerce::updateProduct((integer)$products[2][$sku], $fields);

        }

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

    public function products_value($bc_products, $csv_products, $checking_feed){



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

                    if(isset($checking_feed[substr($item->sku, $pos + 2)])){

                        $checking_feed[substr($item->sku, $pos + 2)]['exists_on_boo'] = 1;

                    }

                    $boo_products->save();

                

                }else{

                 

                   $prods[1][] = $item->sku;

                }

            }else{



                if(isset($csv_products[$item->sku])){

                

                    $prods[0][$item->sku] = $csv_products[$item->sku];

                    if(isset($checking_feed[$item->sku])){

                        $checking_feed[$item->sku]['exists_on_boo'] = 1;

                    }

                

                }else{

                

                    $prods[1][] = $item->sku;

                

                }

            }

            

        }

        $prods[4] = $checking_feed;

        return $prods;

    }



    public function get_inactive_products($products){



        $invalide_products = array();

        foreach($products as $key => $product){

            if($product == 'N'){

                $invalide_products[$key] = $product;

            } 

        }

        return $invalide_products;

    }



    public function get_out_of_stock_products($products){



        $invalide_products = array();

        foreach($products as $key => $product){

            if($product == 'outofstock'){

                $invalide_products[$key] = $product;

            } 

        }

        return $invalide_products;

    }



    public function get_deleted_products($products){



        $invalide_products = array();

        foreach($products as $key => $product){

            if($product == 'deleted'){

                $invalide_products[$key] = $product;

            } 

        }

        return $invalide_products;

    }



    public function get_discontinued_products($products){



        $invalide_products = array();

        foreach($products as $key => $product){

            if($product == 'discontinued'){

                $invalide_products[$key] = $product;

            } 

        }

        return $invalide_products;

    }





    public function get_valide_products($products){

        

        $valide_products = array();

        foreach($products as $key => $product){

            if($product == 'Y' || $product == 'available'){

                $valide_products[$key] = $product;

            } 

        }

        return $valide_products;

    }



    public function type_of_product($products){



        $types = array();

        foreach($products as $product){

            if(!in_array($product, $types)){

                $types[] = $product;

            }

        }



        return $types;

    }





    public function log_time(){



        // Time of execution

        $time_elapsed_secs = microtime(true) - $this->start;



        //Logs

        // Log::info(substr(__FILE__, 35) . '/' . __FUNCTION__);

        Log::info('Success!');

        Log::info('Time of execution ' . $time_elapsed_secs);

    }



    public function email(){

        $func = (!empty($_GET["func"])) ? $_GET["func"] : "view";

        $folder = (!empty($_GET["folder"])) ? $_GET["folder"] : "INBOX";

        $uid = (!empty($_GET["uid"])) ? $_GET["uid"] : 0;



        // connect to IMAP

        $mailboxPath = '{imap.gmail.com:993/imap/ssl}INBOX';

        $imap = imap_open($mailboxPath, 'kylie@buyorganicsonline.com.au', 'Fyic2020') or die('Cannot connect to Gmail: ' . imap_last_error());;



        $numMessages = imap_num_msg($imap);

        $ok = 1;

        $i = $numMessages;

        while($ok){

            $header = imap_header($imap, $i);



            $fromInfo = $header->from[0];

            $replyInfo = $header->reply_to[0];

            $uid = imap_uid($imap, $i);

            

            if($fromInfo->host == 'netsuite.com'){

                $body = $this->get_part($imap, $uid, "OTHER");

                // if HTML body is empty, try getting text body

                if ($body == "") {

                    $body = $this->get_part($imap, $uid, "OTHER");

                }

                $ok = 0;

                exit();

            }

            $i--;

        }

    }



    public function get_part($imap, $uid, $mimetype, $structure = false, $partNumber = false) {

        if (!$structure) {

                $structure = imap_fetchstructure($imap, $uid, FT_UID);

        }

        

        $attachments = array();

        if(isset($structure->parts) && count($structure->parts)) {



            for($i = 0; $i < count($structure->parts); $i++) {



                $attachments[$i] = array(

                    'is_attachment' => false,

                    'filename' => '',

                    'name' => '',

                    'attachment' => ''

                );

                

                if($structure->parts[$i]->ifdparameters) {

                    foreach($structure->parts[$i]->dparameters as $object) {

                        if(strtolower($object->attribute) == 'filename') {

                            $attachments[$i]['is_attachment'] = true;

                            $attachments[$i]['filename'] = $object->value;

                        }

                    }

                }

                

                if($structure->parts[$i]->ifparameters) {

                    foreach($structure->parts[$i]->parameters as $object) {

                        if(strtolower($object->attribute) == 'name') {

                            $attachments[$i]['is_attachment'] = true;

                            $attachments[$i]['name'] = $object->value;

                        }

                    }

                }

                

                if($attachments[$i]['is_attachment']) {

                    $attachments[$i]['attachment'] = imap_fetchbody($imap, $uid, $i+1, FT_UID);

                    if($structure->parts[$i]->encoding == 3) { // 3 = BASE64

                        $attachments[$i]['attachment'] = base64_decode($attachments[$i]['attachment']);

                    }

                    elseif($structure->parts[$i]->encoding == 4) { // 4 = QUOTED-PRINTABLE

                        $attachments[$i]['attachment'] = quoted_printable_decode($attachments[$i]['attachment']);

                    }



                    $file_name = 'oborne_new.csv';



		            $this->store_json_file($attachments[$i]['attachment'], $file_name);

                }

            }

        }

        // file_put_contents("/path/to/filename", $attachment[1]['attachment']);

        

        return $attachments;

    }

    

}