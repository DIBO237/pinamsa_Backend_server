const mongoose=require('mongoose');

const OrderSchema=new mongoose.Schema({
    user:{
        type:String,
    },
    user_id:{
        type:String,
        required:true
    },
    store_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Store'
    },
    items_list:{
        type:Array
    },
    totalValue:{
        type:Number,
    },
    user_address:{
        type:String,
        required:true,
    },
    user_phone_no:{
        type:String,
        required:true, 
    },
    coupons_applied:{
        type:String
    },
    prefered_date_of_delievery:{
        type:String,
    },
    prefered_time_of_delievery:{
        type:String
    },
    delivery_status:{
        type:Boolean,
        default:false
    }
})

OrderSchema.set('timestamps',true);

module.exports=mongoose.model('Order',OrderSchema);