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
const jwt=require('jsonwebtoken');
const multer=require('multer');
const Store= require('./models/Store');
const Item=require('./models/Item');
const auth=require('./middleware/auth');
app.use(express.json());
app.get('/',(req,res)=>{
    res.send("Hello");
})

app.post('/store/register',async(req,res)=>{
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

app.post('/store/add_data',auth,async(req,res)=>{
    const data=req.body;
    const store=await Store.findOne({_id:req.store._id}).then(async(store)=>{
        if(!store){
            return res.status(400).send({"error":"the store doesnot exist"});
        }else{
            const item=await Item(req.body);
            item.store_id=req.store._id;
            await item.save().then(async(item)=>{
                store.item_list.push(item);
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

app.post('/store/update_item/:id',auth,async(req,res)=>{
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

app.get('/store/all_item',auth,async(req,res)=>{
    const page=req.query.page;
    const limit=req.query.limit;
    const id=req.store._id;
    console.log(id);
    const store=await Store.findOne({_id:id}).populate('item_list').exec()
    .then((store)=>{
        const startIndex=(page-1)*limit;
        //end index of page
        const endIndex=page*limit;
        if(endIndex<store.item_list.length){
            endIndex=store.item_list.length;
        }
        var result=store.item_list.slice(startIndex,endIndex);
        //return res.status(200).send({"institute_List":result})
        return res.status(200).send({"store_item":result});
    }).catch(err=>{
        return res.status(400).send({"message":err.message})
    })
})


//this is for user app section
app.get('/user/get_category/:id',async(req,res)=>{
    const page=req.query.page;
    const limit=req.query.limit;
    //const id=req.store._id;
    const id=req.params.id;
    const category=req.query.category;
   
    const store=await Store.findOne({_id:id}).then((store)=>{
        if(!store){
            throw new Error("store is not accepting order for the item")
        }else{
            //var temparr=store.item_list.
        const startIndex=(page-1)*limit;
        //end index of page
        const endIndex=page*limit;
        store.item_list.map((item)=>{
            console.log(item);
        })
        if(endIndex<store.item_list.length){
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

app.listen(PORT,()=>{
    console.log("Server is up and running on "+ PORT);
})



