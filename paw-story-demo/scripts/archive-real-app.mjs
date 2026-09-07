import {deflateRawSync} from 'node:zlib';
/** Deterministic UTF-8 ZIP with binary artifact support. */
export function zip(files) {
 const records=[], directory=[];let offset=0;
 for(const [name,input] of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))) {
  const filename=Buffer.from(name),bytes=Buffer.from(input),packed=deflateRawSync(bytes);let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  const local=Buffer.alloc(30+filename.length);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);filename.copy(local,30);
  const central=Buffer.alloc(46+filename.length);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);filename.copy(central,46);records.push(local,packed);directory.push(central);offset+=local.length+packed.length;
 }
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(directory.length,8);end.writeUInt16LE(directory.length,10);end.writeUInt32LE(directory.reduce((n,b)=>n+b.length,0),12);end.writeUInt32LE(offset,16);return Buffer.concat([...records,...directory,end]);
}
