// Run: node src/seeds/merchantSeed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Merchant = require('../models/Merchant');

const merchants = [
  { name:'Monoprix Tunis Centre', nameAr:'مونوبري تونس', category:'supermarche',
    location:{type:'Point',coordinates:[10.1815,36.8065]}, ville:'Tunis', gouvernorat:'Tunis',
    address:'Av. Habib Bourguiba, Tunis', phone:'71000001', rating:4.2, isVerified:true, isFeatured:true },
  { name:'Pizza Hut Lac 1', nameAr:'بيتزا هت الحي البحري', category:'restaurant',
    location:{type:'Point',coordinates:[10.2352,36.8330]}, ville:'Tunis', gouvernorat:'Tunis',
    address:'Les Berges du Lac 1, Tunis', phone:'71000002', rating:4.0, isVerified:true },
  { name:'Pharmacie Centrale', nameAr:'الصيدلية المركزية', category:'pharmacie',
    location:{type:'Point',coordinates:[10.1700,36.8100]}, ville:'Tunis', gouvernorat:'Tunis',
    address:'Rue de Rome, Tunis', phone:'71000003', rating:4.5, isVerified:true },
  { name:'Café Saf Saf', nameAr:'مقهى صافصاف', category:'cafe',
    location:{type:'Point',coordinates:[10.1820,36.8070]}, ville:'Tunis', gouvernorat:'Tunis',
    address:'Médina, Tunis', phone:'71000004', rating:3.8 },
  { name:'Géant Casino La Marsa', nameAr:'جيان لامارسا', category:'supermarche',
    location:{type:'Point',coordinates:[10.3250,36.8780]}, ville:'La Marsa', gouvernorat:'Tunis',
    address:'Route de La Marsa', phone:'71000005', rating:4.1, isVerified:true, isFeatured:true },
  { name:'Carrefour Sousse', nameAr:'كارفور سوسة', category:'supermarche',
    location:{type:'Point',coordinates:[10.6413,35.8256]}, ville:'Sousse', gouvernorat:'Sousse',
    address:'Route Nationale 1, Sousse', phone:'73000001', rating:4.0, isVerified:true, isFeatured:true },
  { name:'Hanout Sidi Bou', nameAr:'حانوت سيدي بوسعيد', category:'hanout',
    location:{type:'Point',coordinates:[10.3400,36.8700]}, ville:'Sidi Bou Saïd', gouvernorat:'Tunis',
    address:'Sidi Bou Saïd', phone:'71000006', rating:3.5 },
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/floucIA')
  .then(async () => {
    await Merchant.deleteMany({});
    const result = await Merchant.insertMany(merchants);
    console.log('✅ Inserted', result.length, 'merchants');
    process.exit(0);
  }).catch(err => { console.error(err); process.exit(1); });
