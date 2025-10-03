<?php
require_once 'cors.php';
require_once 'conexion.php';
require_once 'check_session.php';
header('Content-Type: application/json; charset=utf-8');

if(empty($_SESSION['id_usuario'])){ echo json_encode(['ok'=>false,'msg'=>'Sesión inválida']); exit; }

$B = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = (int)($B['id_plano_tecnico'] ?? 0);
$idte = (int)($B['id_tipo_estructura'] ?? 0);
$cod  = trim($B['codigo_plano_tecnico'] ?? '');
$des  = trim($B['descripcion'] ?? '');
$cpeso= $B['capacidad_peso'] !== '' ? (float)$B['capacidad_peso'] : null;
$cper = $B['capacidad_persona'] !== '' ? (int)$B['capacidad_persona'] : null;
$dim  = trim($B['dimension'] ?? '');
$mat  = trim($B['materiales'] ?? '');
$est  = ($B['estado'] ?? 'ACTIVO') === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';

if(!$idte || $cod===''){ echo json_encode(['ok'=>false,'msg'=>'Tipo y Código son obligatorios']); exit; }

try{
  // Unicidad de código
  $q = $pdo->prepare("SELECT 1 FROM plano_tecnico WHERE codigo_plano_tecnico=:c AND id_plano_tecnico<>:id LIMIT 1");
  $q->execute([':c'=>$cod, ':id'=>$id]);
  if($q->fetch()){ echo json_encode(['ok'=>false,'msg'=>'Código de plano ya existe']); exit; }

  if($id>0){
    $sql = "UPDATE plano_tecnico
            SET id_tipo_estructura=:te, codigo_plano_tecnico=:c, descripcion=:d,
                capacidad_peso=:cp, capacidad_persona=:cr, dimension=:di,
                materiales=:m, estado=:e
            WHERE id_plano_tecnico=:id";
    $st = $pdo->prepare($sql);
    $st->execute([
      ':te'=>$idte, ':c'=>$cod, ':d'=>$des,
      ':cp'=>$cpeso, ':cr'=>$cper, ':di'=>$dim,
      ':m'=>$mat, ':e'=>$est, ':id'=>$id
    ]);
  }else{
    $sql = "INSERT INTO plano_tecnico
              (id_tipo_estructura, codigo_plano_tecnico, descripcion,
               capacidad_peso, capacidad_persona, dimension, materiales, estado)
            VALUES
              (:te,:c,:d,:cp,:cr,:di,:m,:e)";
    $st = $pdo->prepare($sql);
    $st->execute([
      ':te'=>$idte, ':c'=>$cod, ':d'=>$des,
      ':cp'=>$cpeso, ':cr'=>$cper, ':di'=>$dim,
      ':m'=>$mat, ':e'=>$est
    ]);
    $id = (int)$pdo->lastInsertId();
  }
  echo json_encode(['ok'=>true,'id_plano_tecnico'=>$id]);
}catch(Throwable $e){
  http_response_code(400);
  echo json_encode(['ok'=>false,'msg'=>'No se pudo guardar']);
}
