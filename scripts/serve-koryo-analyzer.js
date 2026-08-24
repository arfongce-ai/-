const http=require("http");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..","www");
const targets={
  textbook:path.join(root,"models","koryo-textbook-reference.json"),
  video:path.join(root,"models","koryo-video-reference.json")
};
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".wasm":"application/wasm",".task":"application/octet-stream",".jpg":"image/jpeg"};
function valid(data){
  const ids=["ready_stance",...Array.from({length:30},(_,i)=>`koryo_m${i+1}`)];
  return data?.textbook?.poomsae_id==="koryo" && data?.video?.poomsae_id==="koryo" &&
    data.textbook.stored_content==="joint_coordinates_and_angles_only" &&
    data.video.stored_content==="ordered_joint_coordinates_and_angles_only" &&
    ids.every(id=>Array.isArray(data.textbook.movements?.[id])&&data.textbook.movements[id].length>0&&Array.isArray(data.video.movements?.[id])&&data.video.movements[id].length===4);
}
http.createServer((req,res)=>{
  if(req.method==="POST"&&req.url==="/__save-koryo"){
    let body=""; req.on("data",c=>body+=c); req.on("end",()=>{
      try { const data=JSON.parse(body); if(!valid(data)) throw new Error("고려 기준 데이터 검증 실패");
        fs.writeFileSync(targets.textbook,JSON.stringify(data.textbook,null,2)+"\n");
        fs.writeFileSync(targets.video,JSON.stringify(data.video,null,2)+"\n");
        res.writeHead(200,{"content-type":"text/plain; charset=utf-8"}); res.end("saved");
      } catch(e){res.writeHead(400,{"content-type":"text/plain; charset=utf-8"});res.end(e.stack||String(e));}
    }); return;
  }
  const rel=decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"koryo-reference-analyzer.html";
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end("not found");return;}
  res.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream","cache-control":"no-store"}); fs.createReadStream(file).pipe(res);
}).listen(8767,"127.0.0.1",()=>console.log("http://127.0.0.1:8767/koryo-reference-analyzer.html"));
