const express=require('express');
require('dotenv').config();
const cors=require('cors');
const PORT=process.env.PORT || 3000;
const app=express();
const path=require('path');
require('./db');
const bodyParser=require("body-parser");
app.use(cors());
app.use(
    bodyParser.urlencoded({
      extended: true,
    })
);

const bcrypt =require('bcrypt');
const uuid = require('uuid-v4');
const jwt=require('jsonwebtoken');
const multer=require('multer');
const Store= require('./models/Store');
const Order=require('./models/Order');
const Item=require('./models/Item');
const auth=require('./middleware/auth');
const { exec } = require('child_process');
var admin = require("firebase-admin");

var serviceAccount = require('./service-account-file.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket:process.env.Bucket_firebase
});

const db=admin.firestore();
var bucket = admin.storage().bucket();
// var filename = "image/"

async function uploadFile(filename) {

    const metadata = {
      metadata: {
        // This line is very important. It's to create a download token.
        firebaseStorageDownloadTokens: uuid()
      },
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    };
  
    // Uploads a local file to the bucket
    await bucket.upload(filename, {
      // Support for HTTP requests made with `Accept-Encoding: gzip`
      gzip: true,
      metadata: metadata,
    });

  return new Promise(function(resolve, reject) {
      var f=filename.slice(7);
    resolve({"file":f});
    reject({"error":"Problem while fetching"});
  });
  }
  
  //uploadFile().catch(console.error);

const fileStorageEngine=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"images")
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now() + "_" + file.originalname)
    },
});

const fileFilter=(req,file,cb)=>{
    if(file.mimetype==='image/jpeg' || file.mimetype==='image/png'){
        cb(null,true);
    }else{
        cb(null,false);
    }
}

const upload=multer({storage:fileStorageEngine,
    limits:{
    fileSize:1024*1024*4
},
fileFilter:fileFilter
});

app.use(express.json());
app.get('/',(req,res)=>{
    res.send("Hello");
})

app.post('/store/register',upload.single('image'),async(req,res)=>{
    try{
        const data=req.body;
        if(!data.name && ! data.password){
            return res.status(400).send({
                "message":"please fill the credentilals"
            })
        }
        const oldStore=await Store.findOne({name:req.body.name}).then(async(_store)=>{
            //if user exist we throw an error.That user exists
            if(_store){
                return res.status(400).send({
                    "message":"The user exists please log in"
                });
            }else{
                const store = await Store(req.body);
                //now here we are assigning AUTH token to institute for further authorization     
                const token = jwt.sign(
                    {name:store.name,_id:store._id},
                    process.env.SECRET_KEY
                  );

                  store.token=token;
                  //let temp_file;
                  if(req.file){
                    await uploadFile(req.file.path).then((file)=>{
                        console.log(file.file)
                        store.img_url=file.file
                        //console.log(store);
                    }).catch(err=>{
                        throw new Error(err.error);
                    })
                    }
                    //store.img_url=temp_file.to_String();
                  await store.save().then((store)=>{
                    return res.status(200).send({
                        "message":store
                    })
                  }).catch(e=>{
                      console.log(e);
                        throw new Error(e)
                  })
            }
        }).catch((e)=>{
            return res.status(409).send({"message":e.message})
        })

    }catch(e){
        console.log(err.message);
    }
})



app.post('/store/login',async(req,res)=>{
    //fetching email and password from frontend as data
    const data=req.body;
    //If data is not present then raise an error of empty feilds
    if(!data.name && !data.password){
        return res.status(400).send("All input is required");
    }
    //then find the document with than email_id.
    const store=await Store.findOne({name:data.name}).then(async(store)=>{
        if(!store){
            return res.status(400).send("Please enter an valid Id")
        }
        //if email and password are present and we compared them to be true.
        if(store && (await store.comparePassword(data.password))){
            const token=jwt.sign({
                _id:store._id,
                name:store.name
            },process.env.SECRET_KEY);
            store.token=token;
            return res.status(200).json({"Store":store})
        }else{
            return res.status(400).send("please fill correct credentials")
        }
    }).catch(e=>{
        return res.status(400).send("Error in loging in");
    })

})

app.get('/store/test',auth,async(req,res)=>{
    res.send(req.store);
})

app.post('/store/add_category',upload.single('image'),auth,async(req,res)=>{
    //const data=req.body;
    const store=await Store.findOne({_id:req.store._id}).exec()
    .then(async (store)=>{
        if(!store){
            return res.status(400).send({"error":"problem while fetching the data of store"})
        }else{
            store.category_list.push({
                "category_name":req.body.category_name,
                "category_item":[],
                "category_image":req.file!=undefined || null?req.file.path:''
            })
            await store.save().then((store)=>{
                return res.status(201).send({"store":store})
            }).catch(e=>{
                throw new Error("item doesnot get stored due to some error");
            })
        }
    }).catch(e=>{
        return res.status(400).send({"error":"problem while uploading data to server"});
    })
})

app.post('/store/add_item_to_category', upload.array('images',3),auth,async(req,res)=>{
    //const data=req.body;
    //console.log(req.body);
    const store=await Store.findOne({_id:req.store._id}).exec()
    .then(async(store)=>{
        if(!store){
            return res.status(400).send({"error":"the store doesnot exist"});
        }else{
            const item=await Item(req.body);
            item.store_id=req.store._id;
            console.log(req.files)
            for(var x=0;x<3;x++){
                item.item_display_image.push(req.files[x].path);    
            }
            item.item_image=item.item_display_image[0];
            await item.save().then(async(item)=>{
                store.category_list.map((category_element)=>{
                    if(category_element.category_name==item.category){
                        category_element.category_item.push(item)
                    }
                })
                store.item_list.push(item);
                // const category_element={
                //     "category_name":item.category,
                //     "category_item":
                // }
                // store.category_list.push({
                    
                // })
                await store.save().then((store)=>{
                    console.log(store);
                    return res.status(200).send({"store":store});
                })
            }).catch(e=>{
                return res.status(400).send({"error":e.message});
            })
        }

    }).catch(e=>{
        return res.status(400).send({"error":"problem while fetching data from server"});
    })
})

app.get('/store/get_categories',auth,async(req,res)=>{
    const store=await Store.findOne({_id:req.store._id}).exec()
    .then((store)=>{
        if(!store){
            return res.status(400).send({"error":"Couldnot find store"})
        }else{
            var list=[];
            store.category_list.map(item=>{
                list.push({"category_name":item.category_name,"category_image":item.category_image})
            })
            return res.status(200).send({"category_list":list});
            //return res.status(200).send({"category_list":store.category_list});
        }
    }).catch(e=>{
        return res.status(400).send({"error":"An error occur while connecting to server"})
    })
})

app.get('/store/get_category_items',auth,async(req,res)=>{
    //const category=req.query.category;
    const page=req.query.page;
    const limit=req.query.limit;
    const store=await Store.findOne({_id:req.store._id}).exec()
    .then((store)=>{
        if(!store){
            return res.status(400).send({"error":"Couldnot find store"})
        }else{
           var temparr=store.category_list.filter(item=>{
               return item.category_name==req.query.category;
           })
           const startIndex=(page-1)*limit;
           //end index of page
           const endIndex=page*limit;
           if(endIndex<temparr.length){
               endIndex=temparr.length;
           }
           var result=temparr.slice(startIndex,endIndex);
           //return res.status(200).send({"institute_List":result})
           return res.status(200).send({"store_item":result});
        }
    }).catch(e=>{
        return res.status(400).send({"error":e.message})
    })
})

app.get('/store/item/:id',auth,async(req,res)=>{
    const data=req.params.id;
    const item=await Item.findOne({_id:data}).then(async(item)=>{
        if(!item){
            return res.status(400).send({"error":"Unable to fetch error"})
        }else{
            return res.status(200).send({item:item}); 
        }
    }).catch((err)=>{
        return res.status(400).send({"error":"Unable to fetch error"})
    })
})

app.post('/store/update_item/:id',upload.array('images',3),auth,async(req,res)=>{
    const id=req.params.id;
    const data=req.body;
    const item=await Item.findById({_id:id}).exec()
    .then((item)=>{
        if(!item){
            return res.status(400).send({"error":"Item doesnot exist"})
        }
        Item.updateOne({_id:id},data).exec()
        .then(item=>{
            return res.status(201).send({"item":item});
        }).catch(e=>{
             throw new Error(e.message);
        })
    }).catch(e=>{
        return res.status(400).send({"message":e.message})
    })
})


app.post('/store/add_premium_item',upload.array('images',3),auth,async(req,res)=>{
    const store=await Store.findOne({_id:req.store._id}).exec()
    .then(async(store)=>{
        if(!store){
            return res.status(400).send({"error":"the store doesnot exist"});
        }else{
            if(store.premium_item_count>10){
                return res.status(400).send({"error":"You already have 10 items as premium"})
            }
            const item=await Item(req.body);
            item.store_id=req.store._id;
            for(var x=0;x<3;x++){
                item.item_display_image.push(req.files[x].path);    
            }
            item.item_image=item.item_display_image[0];
            await item.save().then(async(item)=>{
                store.category_list.map((category_element)=>{
                    if(category_element.category_name==item.category){
                        category_element.category_item.push(item)
                        store.item_list.push(item);
                        store.premium_item_list.push(item);
                        store.premium_item_count=store.premium_item_count+1;
                    }
                })
               
                await store.save().then((store)=>{
                    console.log(store);
                    return res.status(200).send({"store":store});
                })
            }).catch(e=>{
                return res.status(400).send({"error":e.message});
            })
        }

    }).catch(e=>{
        return res.status(400).send({"error":"problem while fetching data from server"});
    })
})

app.delete('/store/remove_from_premium_item/:id',auth,async(req,res)=>{
    const store=await Store.findOne({_id:req.store._id}).exec()
    .then(async(store)=>{
        if(!store){
            return res.status(400).send({"error":"the store doesnot exist"});
        }else{
            
            // store.premium_item_list.filter((item)=>{
            //     return item!==req.params.id
            // })
            var result=store.premium_item_list;
            var index=result.indexOf(req.params.id);
            if(index>-1){
                result.splice(index,1);
                store.premium_item_count=store.premium_item_count-1;
            }else{
                return res.status(400).send({"error":"item doesnot exist"})
            }
            store.premium_item_list=result;
            await store.save().then((store)=>{
                console.log(store);
                return res.status(200).send({"store":store});
            })
        }
    }).catch(e=>{
                return res.status(400).send({"error":e.message});
            })
})


//id is order id
app.post('/store/put_order_to_dispatched_order_list/:id',auth,async(req,res)=>{
    const store=await Store.findById({_id:req.store._id}).exec()
    .then(async(store)=>{
        if(!store){
            throw new Error("store is not accepting order for the item")
        }else{
            for(var x=0;x<store.order_pending.length;x++){
                if(store.order_pending[x]._id==req.params.id){
                    store.order_dispatch.push(store.order_pending[x]);
                    //arr = arr.filter(item => item !== value)
                    break;
                }
            }
            store.order_pending = store.order_pending.filter(item => item._id !== req.params.id)
            await store.save().then(store=>{
                return res.status(201).send({"store":store})
            }).catch(err=>{
                throw new Error("error at server")
            })
        }
    }).catch(err=>{
        console.log(err);
        return res.status(400).send({"error":err.message})
    })
})

// app.get('/store/all_item',auth,async(req,res)=>{
//     const page=req.query.page;
//     const limit=req.query.limit;
//     const id=req.store._id;
//     console.log(id);
//     const store=await Store.findOne({_id:id}).populate('item_list').exec()
//     .then((store)=>{
//         const startIndex=(page-1)*limit;
//         //end index of page
//         const endIndex=page*limit;
//         if(endIndex<store.item_list.length){
//             endIndex=store.item_list.length;
//         }
//         var result=store.item_list.slice(startIndex,endIndex);
//         //return res.status(200).send({"institute_List":result})
//         return res.status(200).send({"store_item":result});
//     }).catch(err=>{
//         return res.status(400).send({"message":err.message})
//     })
// })




//this is for user app section

app.get('/user/get_categories/:id',async(req,res)=>{

    const store=await Store.findById({_id:req.params.id}).exec()
    .then((store)=>{
        if(!store){
            throw new Error("The store is not is not responding right now")
        }else{
            var list=[];
            store.category_list.map(item=>{
                list.push({"category_name":item.category_name,"category_image":item.category_image,"_id":item._id})
            })
            return res.status(200).send({"category_list":list});
        }
    }).catch(err=>{
        return res.status(400).send({"message":err.message})
    })

})
app.get('/user/get_category/:id',async(req,res)=>{
    const page=req.query.page;
    const limit=req.query.limit;
    //const id=req.store._id;
    const id=req.params.id;
    const category=req.query.category;
    const store=await Store.findOne({_id:id}).populate({
        path:'category_list',
        populate:{
            path:'category_item'
        }
    }).exec().then((store)=>{
        if(!store){
            throw new Error("store is not accepting order for the item")
        }else{
            console.log(store);
            var temparr=[];
            store.category_list.map((item)=>{
                //console.log(item.category_name==category)
                if(item.category_name==category){
                    //console.log(item)
                   temparr=item.category_item
                }
            })
        var startIndex=(page-1)*limit;
        var endIndex=page*limit;
        
        if(endIndex>temparr.length){
            endIndex=temparr.length;
        }
        var result=temparr.slice(startIndex,endIndex);
        //return res.status(200).send({"institute_List":result})
        return res.status(200).send({"store_item":result});
        }
    }).catch(err=>{
        console.log(err);
        return res.status(400).send({"error":err.message});
    })
})

app.get('/user/get_items_from_store/:id',async(req,res)=>{
    const page=req.query.page;
    const limit=req.query.limit;
    const store=await Store.findOne({_id:req.params.id}).populate('item_list').exec()
    .then((store)=>{
        if(!store){
            throw new Error("store is not accepting order for the item")
        }else{
            
        var startIndex=(page-1)*limit;
        var endIndex=page*limit;
        
        if(endIndex>store.item_list.length){
            endIndex=store.item_list.length;
        }
        var result=store.item_list.slice(startIndex,endIndex);
        //return res.status(200).send({"institute_List":result})
        return res.status(200).send({"store_item":result});
        }
    }).catch(err=>{
        console.log(err);
        return res.status(400).send({"error":err.message});
    })

})

app.get('/user/get_premium_items/:id',async(req,res)=>{
    const store=await Store.findOne({_id:req.params.id}).populate('premium_item_list').exec()
    .then((store)=>{
        if(!store){
            throw new Error("store is not accepting order for the item")
        }else{
            return res.status(200).send({"premium_list":store.premium_item_list})
        }
    }).catch(err=>{
        console.log(err);
        return res.status(400).send({"error":err.message});
    })
})

app.post('/user/post_order/:id',async(req,res)=>{
    const store=await Store.findById({_id:req.params.id}).exec()
    .then(async(store)=>{
        if(!store){
            throw new Error("store is not accepting order for the item")
        }else{
            const order=await Order(req.body);
            
            await order.save().then(async(order)=>{
                store.order_pending.push(order._id);
                await store.save().then((store)=>{
                    console.log(store);
                    return res.status(201).send({"order":order})
                }).catch(err=>{
                    throw new Error("store is not accepting order for the item")    
                })
                
            }).catch(err=>{
                throw new Error("store is not accepting order for the item")
            })
        }
    }).catch(err=>{
        console.log(err);
        return res.status(400).send({"error":err.message});
    })
})



app.listen(PORT,()=>{
    console.log("Server is up and running on "+ PORT);
})



