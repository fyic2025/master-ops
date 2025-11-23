<?php

	include 'BigCommerceController.php';
	include 'Api_manager.php';
	include 'SupplierFactory.php';
	include 'OborneController.php';
	require 'vendor/autoload.php';
	require 'config/database.php';
	use Illuminate\Database\Capsule\Manager as Capsule;
        
	$factory = new SupplierFactory();

	//_____________
        
       // $oborne   = $factory->getSupplier('Kadac');
       // $oborne->set_feed_products();
       // $oborne->do_categs_update_products();
     //  $oborne->do_check_categ();
      //  $oborne->get_prods();
        echo __DIR__;
 /*       $uhp = $factory->getSupplier('Uhp');
        $uhp->set_feed_products();
        $uhp->do_categs_update_products();
	// $uhp->set_feed_products();*/
	//$uhp->set_changed_and_new_products();

	// // var_dump($uhp->get_changed_products());exit();
	//$uhp->update();

        /*$oborne   = $factory->getSupplier('Oborne');
	$oborne->set_feed_products();
	$oborne->set_changed_and_new_products();
	// var_dump($oborne->get_changed_products());
	$oborne->update();*/
      
        return false;
	// $uhp = $factory->getSupplier('Uhp');
	// $uhp->set_feed_products();
//	 $uhp->set_changed_and_new_products();
	// // var_dump($uhp->get_changed_products());exit();
	//$uhp->update();


	/* $kadac   = $factory->getSupplier('Kadac');
	 $kadac->set_feed_products();
 	$kadac->set_changed_and_new_products();
	// // var_dump($kadac->get_new_products());
	 $kadac->update();


	$oborne   = $factory->getSupplier('Oborne');
	$oborne->set_feed_products();
	$oborne->set_changed_and_new_products();

	// var_dump($oborne->get_changed_products());
	$oborne->update();

*/





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

	//

	// //______________________________________________



	// //_________PRICE CHANGING TEST ZONE_________

	// $uhp   = $factory->getSupplier('Uhp');

	// $uhp->test_products_feed();

	// $kadac   = $factory->getSupplier('Kadac');

	// $kadac->test_products_feed();

	// $oborne   = $factory->getSupplier('Oborne');

	// $oborne->test_products_feed();


 
?>

