const mongoose=require('mongoose');

const ItemSchema=new mongoose.Schema({
    item_name:{
        type: String,
        required: true

    } ,
    discounted_price:{
        type: mongoose.Decimal128,
            required: true
    },
    retail_price:{
        type: mongoose.Decimal128,
        required: true
    },
    item_quantity:{
        type: Number,
        required: true
    },
    gst:{
        type: Number,
        // required: true
    },
    item_description:{
        type: String,
        required: true
    },
    item_image:{
        type: String,
    },
    item_display_image:{
        type:[{type: String}]
    },
    weight_type:{
        type: String,
        // required: true
    },
    rank:{
        type: Number,
        // required: true
    },
    reviews:{
        type:[{type:mongoose.Schema.Types.ObjectId,ref:'Review'}]
    },
    carbs:{
        type: mongoose.Decimal128,
    },
    protein:{
        type: mongoose.Decimal128
    },
    fat:{
        type: mongoose.Decimal128
    },
    category:{
        type:String,
        required:true
    },
    store_id:{
        type:mongoose.Schema.Types.ObjectId
    }

})

ItemSchema.set('timestamps',true);

module.exports=mongoose.model('Item', ItemSchema);