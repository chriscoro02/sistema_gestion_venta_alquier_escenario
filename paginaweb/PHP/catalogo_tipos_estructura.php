<?php
require_once 'cors.php';
require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

try{
  $sql = "SELECT id_tipo_estructura, nombre
          FROM tipo_estructura
          WHERE estado='ACTIVO'
          ORDER BY nombre";
  $stmt = $pdo->query($sql);
  echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
}catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>'Error al cargar tipos']);
}
