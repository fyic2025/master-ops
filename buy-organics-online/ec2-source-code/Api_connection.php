<?php

use Bigcommerce\Api\Client as Bigcommerce;
class Api_connection{

	private $auth_token = 'd9y2srla3treynpbtmp4f3u1bomdna2';
	private $client_id  = 'nvmcwck5yr15lob1q911z68d4r6erxy';
	private $store_hash = 'hhhi';
	
	public function get_auth_token(){
		 return $this->auth_token;
	}

	public function get_client_id(){
		 return $this->client_id;
	}

	public function get_store_hash(){
		 return $this->store_hash;
	}


	
}