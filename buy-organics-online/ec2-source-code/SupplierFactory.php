<?php

use Bigcommerce\Api\Client as Bigcommerce;

include 'Oborne.php';
include 'Kadac.php';
include 'Uhp.php';
include 'GlobalNature.php';
require 'vendor/autoload.php';
require 'config/database.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Storage;

class SupplierFactory {

    public function getSupplier($type) {
        if ($type == 'Uhp') {
            return new Uhp('Uhp','/var/www/clients/client0/web15/web/uhp_prods.csv'/* 'http://shop.uhp.com.au/uhp_products_export.php?format=csv&accno=10386&cuid=BUYORO0102'*/);
        }

        if ($type == 'Kadac') {
            return new Kadac('Kadac', 'https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv');
        }

        if ($type == 'Oborne') {
            return new Oborne('Oborne', 'http://bigcupdate.fyic.com.au/oborne_new.csv');
        }
        if ($type == 'GlobalNature') {
            return new GlobalNature('GlobalNature', 'http://bigcupdate.fyic.com.au/globalnature_new.csv');
        }
    }

}
