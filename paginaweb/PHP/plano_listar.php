<?php
require_once 'cors.php';
require_once 'conexion.php';
require_once 'check_session.php';
header('Content-Type: application/json; charset=utf-8');

$q = trim($_GET['q'] ?? '');
$estado = trim($_GET['estado'] ?? '');

$params = [];
$where  = [];

if($q!==''){
  $where[] = "(UPPER(pt.codigo_plano_tecnico) LIKE UPPER(:q)
           OR UPPER(te.nombre) LIKE UPPER(:q)
           OR UPPER(pt.descripcion) LIKE UPPER(:q))";
  $params[':q'] = "%$q%";
}
if($estado!==''){
  $where[] = "pt.estado = :estado";
  $params[':estado'] = $estado;
}

$sql = "SELECT pt.id_plano_tecnico, pt.id_tipo_estructura, pt.codigo_plano_tecnico,
               pt.descripcion, pt.capacidad_peso, pt.capacidad_persona, pt.dimension,
               pt.materiales, pt.fecha_creacion, pt.estado,
               te.nombre AS tipo_estructura
        FROM plano_tecnico pt
        JOIN tipo_estructura te ON te.id_tipo_estructura = pt.id_tipo_estructura";
if($where){ $sql .= " WHERE ".implode(" AND ", $where); }
$sql .= " ORDER BY pt.fecha_creacion DESC LIMIT 300";

try{
  $st = $pdo->prepare($sql);
  $st->execute($params);
  echo json_encode(['ok'=>true,'data'=>$st->fetchAll(PDO::FETCH_ASSOC)]);
}catch(Throwable $e){
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>'Error al listar planos']);
}
