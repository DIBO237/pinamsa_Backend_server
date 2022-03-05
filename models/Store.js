const mongoose=require('mongoose');
const bcrypt=require('bcrypt');
const StoreSchema=new mongoose.Schema({
    name:{
        type: String,
        required: true

    } ,
        address:{
            type: String,
            required: true
        },
        latitude:{
            type: mongoose.Decimal128,
            required: true
        } ,
        longitude:{
            type: mongoose.Decimal128,
            required: true
        } ,        
        item_list:{
            type:[{type:mongoose.Schema.Types.ObjectId,ref:'Item'}]
        } ,
        premium_item_list:{
            type:[{type:mongoose.Schema.Types.ObjectId,ref:'Item'}]
        },
        img_url:{
            type: String,
        },
        order_list:{
            type: Array,
        } ,
        order_dispatch:{
            type: Array,
        },
        order_pending:{
            type: Array,
        } ,
        phone:{
            type: String,
            required: true
        }, 
        password:{
            type:String,
            required:true
        },
        token:{
            type:String
        }
})

StoreSchema.pre('save', function(next) {
    var store = this;

    // only hash the password if it has been modified (or is new)
    if (!store.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(store.password, salt, function(err, hash) {
            if (err) return next(err);
            // override the cleartext password with the hashed one
            store.password = hash;
            next();
        });
    });
});


StoreSchema.methods.comparePassword = async function comparePassword(data) {
    return bcrypt.compare(data, this.password);
};

StoreSchema.set('timestamps',true);

module.exports=mongoose.model('Store',StoreSchema);