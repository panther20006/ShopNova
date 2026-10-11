<?php
// JSON-only backend. No HTML is embedded in this file.
declare(strict_types=1);
ini_set('display_errors','0');
session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax','secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','path'=>'/']);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function out($data,$status=200){http_response_code($status);echo json_encode($data);exit;}
function fail($message,$status=400){out(['error'=>$message],$status);}
try {
$db=new PDO('sqlite:'.__DIR__.'/../storage/shop.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
$db->exec('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL); CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,address TEXT NOT NULL,created TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id)); CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,name TEXT,email TEXT,message TEXT,created TEXT);');
$catalog=json_decode(file_get_contents(__DIR__.'/catalog.json'),true);
$byId=array_column($catalog,null,'id');
$_SESSION['csrf']=$_SESSION['csrf']??bin2hex(random_bytes(24));
$_SESSION['cart']=$_SESSION['cart']??[];
$action=$_GET['action']??'bootstrap';
$body=json_decode(file_get_contents('php://input'),true)??[];
if($_SERVER['REQUEST_METHOD']==='POST' && !hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail('Session expired. Refresh and try again.',403);
function requiredText($body,$key,$min=1,$max=500){$v=trim((string)($body[$key]??''));if(strlen($v)<$min||strlen($v)>$max)fail('Please enter a valid '.$key.'.');return $v;}
function userId(){if(empty($_SESSION['user']))fail('Please sign in to continue.',401);return $_SESSION['user']['id'];}
function cartItems($byId){$items=[];foreach($_SESSION['cart'] as $id=>$qty){if(isset($byId[$id]))$items[]=array_merge($byId[$id],['quantity'=>$qty]);}return $items;}
if($_SERVER['REQUEST_METHOD']==='GET'){
 if($action==='bootstrap')out(['products'=>$catalog,'user'=>$_SESSION['user']??null,'csrf'=>$_SESSION['csrf'],'cart'=>cartItems($byId)]);
 if($action==='orders'){$uid=userId();$q=$db->prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC');$q->execute([$uid]);$orders=$q->fetchAll(PDO::FETCH_ASSOC);foreach($orders as &$o){$o['items']=json_decode($o['items'],true);}out($orders);}
 fail('Unknown endpoint.',404);
}
if($_SERVER['REQUEST_METHOD']!=='POST')fail('Method not allowed.',405);
switch($action){
case 'register':
 $name=requiredText($body,'name',2,80);$email=strtolower(requiredText($body,'email',3,150));$password=(string)($body['password']??'');
 if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($password)<8||strlen($password)>128)fail('Use a valid email and a password of 8–128 characters.');
 $q=$db->prepare('SELECT id FROM users WHERE email=?');$q->execute([$email]);if($q->fetch())fail('This email already has an account.');
 $q=$db->prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)');$q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
 session_regenerate_id(true);$_SESSION['user']=['id'=>(int)$db->lastInsertId(),'name'=>$name,'email'=>$email];out(['ok'=>true]);
case 'login':
 $q=$db->prepare('SELECT * FROM users WHERE email=?');$q->execute([strtolower(trim((string)($body['email']??'')))]);$u=$q->fetch(PDO::FETCH_ASSOC);
 if(!$u||!password_verify((string)($body['password']??''),$u['password']))fail('Email or password is incorrect.',401);
 session_regenerate_id(true);unset($u['password']);$_SESSION['user']=$u;out(['ok'=>true]);
case 'logout': $_SESSION=[];session_regenerate_id(true);out(['ok'=>true]);
case 'cart':
 $id=filter_var($body['id']??null,FILTER_VALIDATE_INT);$qty=filter_var($body['quantity']??null,FILTER_VALIDATE_INT);
 if(!isset($byId[$id])||$qty===false||$qty<0||$qty>10)fail('Quantity must be between 0 and 10.');
 if($qty===0)unset($_SESSION['cart'][$id]);else $_SESSION['cart'][$id]=$qty;
 out(['cart'=>cartItems($byId)]);
case 'checkout':
 $uid=userId();$items=cartItems($byId);if(!$items)fail('Your cart is empty.');
 $address=requiredText($body,'address',10,500);$phone=requiredText($body,'phone',10,10);$pin=requiredText($body,'pincode',6,6);
 if(!preg_match('/^[0-9]{10}$/',$phone)||!preg_match('/^[1-9][0-9]{5}$/',$pin))fail('Enter a valid mobile number and PIN code.');
 $total=0;foreach($items as $p)$total+=$p['price']*$p['quantity'];
 $q=$db->prepare('INSERT INTO orders(user_id,items,total,address,created) VALUES(?,?,?,?,?)');$q->execute([$uid,json_encode($items),$total,$address.' | '.$pin.' | '.$phone,gmdate('c')]);
 $_SESSION['cart']=[];out(['id'=>(int)$db->lastInsertId()]);
case 'contact':
 $name=requiredText($body,'name',2,80);$email=requiredText($body,'email',3,150);$message=requiredText($body,'message',10,2000);if(!filter_var($email,FILTER_VALIDATE_EMAIL))fail('Enter a valid email.');
 $q=$db->prepare('INSERT INTO messages(name,email,message,created) VALUES(?,?,?,?)');$q->execute([$name,$email,$message,gmdate('c')]);out(['ok'=>true]);
default: fail('Unknown endpoint.',404);
}
} catch(Throwable $e){error_log($e->getMessage());out(['error'=>'Server error. Check PHP PDO SQLite support and storage folder permissions.'],500);}
