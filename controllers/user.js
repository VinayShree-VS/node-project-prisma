const bcrypt = require('bcryptjs');
const prisma = require('../config/PGDB');
const {generateToken} = require("../utility/jwt");

const handleGetAllUsers = async (req,res) =>{
    let users = await prisma.user.findMany();
    return res.status(200).send({code:200,data:users}).json();
};

const handleCreateUser = async (req,res)=>{
    if(!req.body){
        return res.status(400).send({code:400,message:"Internal Server Error"});
    };
    
    try{
        const {password,confPassword} = req.body;
        if(password.toLowerCase() !== confPassword.toLowerCase()){
            return res.status(400).send({code:400,message:"Password or Confirm password not matched"});
        }else{
            const hashPassword = await bcrypt.hash(password, 10);
            const hashConfPassword = await bcrypt.hash(confPassword, 10);
            const profileImage = req.file?req.file.path:null;
            
            // let user = await User.create({...req.body,password:hashPassword,confPassword:hashConfPassword,profileImage});
            let user = await prisma.user.create({data:{...req.body,password:hashPassword,confPassword:hashConfPassword,profileImage}});
            let userData = user;
            delete userData._tokens;
            delete userData.password;
            delete userData.confPassword;
            delete userData.roles;

            return res.status(200).send({code:200,message:"User Created",data:userData});
        };
    }catch (error) {
        console.error("Error during user creation:", error);
        if (error.code === "P2002") {
            return res.status(400).send({code: 400,message: `Unique constraint failed on field: ${error.meta.target}`,});
        };
        return res.status(500).send({message: "Internal Server Error",details: error.message,});
    } finally {
        await prisma.$disconnect();
    }
};

const handleUploadProfileImageById = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ status: 400, message: 'No file uploaded' });
        };
        
        let user = await prisma.user.findFirst({where: {AND: [{ id: parseInt(req.params.id) }, { id: req.user.userId }]}});
        if (!user) {
            return res.status(404).send({ status: 404, message: 'User not found' });
        };

        let updatedUser = await prisma.user.update({where: { id: parseInt(req.params.id) },data: { profileImage: req.file.path }});
        let profileImage = `${process.env.DEV_BASE_URL}/${updatedUser.profileImage}`;
        return res.status(200).json({ code: 200, message: 'Profile image updated successfully', data: { profileImage } });

    } catch (error) {
        console.error("Error during user creation:", error);
        if (error.code === "P2002") {
            return res.status(400).send({ code: 400, message: `Unique constraint failed on field: ${error.meta.target}`, });
        };
        return res.status(500).send({ message: "Internal Server Error", details: error.message });
    } finally {
        await prisma.$disconnect();
    };
};

const handleGetUserById = async (req,res)=>{
    let user = await prisma.user.findFirst({where: {AND: [{ id: parseInt(req.params.id) }, { id: req.user.userId }]}});
    if(!user){
        return res.status(404).send({status:404,message:'user not found'});
    }else{
        return res.status(200).send({code:200,message:'Data get successfully',data:user}).json();
    };
};

const handleUpdateUserById = async (req,res)=>{
    let user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: req.body});
    return res.status(200).send({code:200,message:'User Updated'}).json();
};

const handleDeleteUserById = async (req,res)=>{
    let user = await prisma.user.delete({where: { id: parseInt(req.params.id) }});
    return res.status(200).send({code:200,message:'User Deleted'}).json();
};

const handleUserLogin = async (req, res) => {
    const { email, password } = req.body;

    let user = await prisma.user.findUnique({ where: { email: email } });
    if (!user) {
        return res.status(400).send({ code: 400, message: 'Invalid email or password' });
    } else {
        try {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }

            const token = generateToken(user);
            const userData = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                _token: token
            };
            const newToken = await prisma.token.create({ data: {token: token,userId: user.id}});
            return res.status(200).send({ code: 200,message: "User Logged In",data: userData });

        } catch (error) {
            console.error('Error:', error);

            if (error.code === 'P2002') {
                const key = Object.keys(error.meta.target)[0];
                const value = error.meta.target[key];
                return res.status(400).send({ message: `Duplicate key error: ${key} with value "${value}" already exists.`,field: key,value: value,});
            } else {
                return res.status(500).send({ message: 'Internal Server Error' });
            };
        };
    };
};


module.exports = {handleGetAllUsers,handleCreateUser,handleGetUserById,handleUpdateUserById,handleDeleteUserById,handleUserLogin,handleUploadProfileImageById};