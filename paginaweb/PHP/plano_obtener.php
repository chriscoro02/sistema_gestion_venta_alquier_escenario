<?php
require_once 'cors.php';
require_once 'conexion.php';
require_once 'check_session.php';
header('Content-Type: application/json; charset=utf-8');

$id = (int)($_GET['id'] ?? 0);
if(!$id){ echo json_encode(['ok'=>false,'msg'=>'ID requerido']); exit; }

try{
  $st = $pdo->prepare("SELECT * FROM plano_tecnico WHERE id_plano_tecnico=:id");
  $st->execute([':id'=>$id]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if(!$row){ echo json_encode(['ok'=>false,'msg'=>'No encontrado']); exit; }
  echo json_encode(['ok'=>true,'data'=>$row]);
}catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>'Error al obtener plano']);
}
