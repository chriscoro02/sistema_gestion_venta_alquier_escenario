<?php
require_once 'cors.php';
require_once 'conexion.php';
require_once 'check_session.php';
header('Content-Type: application/json; charset=utf-8');

$id = (int) (json_decode(file_get_contents('php://input'), true)['id_plano_tecnico'] ?? 0);
if(!$id){ echo json_encode(['ok'=>false,'msg'=>'ID requerido']); exit; }

try{
  $row = $pdo->query("SELECT estado FROM plano_tecnico WHERE id_plano_tecnico={$id}")->fetch(PDO::FETCH_ASSOC);
  if(!$row){ echo json_encode(['ok'=>false,'msg'=>'No encontrado']); exit; }
  $nuevo = ($row['estado']==='ACTIVO') ? 'INACTIVO' : 'ACTIVO';
  $st = $pdo->prepare("UPDATE plano_tecnico SET estado=:e WHERE id_plano_tecnico=:id");
  $st->execute([':e'=>$nuevo, ':id'=>$id]);
  echo json_encode(['ok'=>true,'estado'=>$nuevo]);
}catch(Throwable $e){
  http_response_code(400);
  echo json_encode(['ok'=>false,'msg'=>'No se pudo cambiar estado']);
}
