<?php
require_once 'cors.php';
require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $sql = "SELECT id_ingeniero,
                 CONCAT('Lic. ', COALESCE(numero_licencia,''), ' · ', COALESCE(especialidad,'')) AS mostrar
          FROM ingeniero
          ORDER BY numero_licencia ASC";
  $res = $cn->query($sql);
  if(!$res) throw new Exception($cn->error);
  $rows = [];
  while($r = $res->fetch_assoc()){ $rows[] = $r; }
  echo json_encode(['ok'=>true,'data'=>$rows]);
} catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>'Error catálogo ingenieros']);
}
