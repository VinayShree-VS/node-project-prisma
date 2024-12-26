const prisma = require('../config/PGDB');

const handleCreateNote = async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json({ code: 400, message: "Invalid request. Please verify your payload and try again."});
    };

    if (!req.user || !req.user.userId) {
        return res.status(400).json({ code: 400,message: "User authentication error. Please log in and try again.",});
    };

    try {
        const note = await prisma.notes.create({data:{ userId: req.user.userId, title: title, description: description}});
        const { userId, ...filteredNote } = note;
        res.status(201).json({code: 201,message: "Success! Your note has been created",data: filteredNote});
    } catch (error) {
        console.error("Error during user creation:", error);
        if (error.code === "P2002") {
            return res.status(400).send({code: 400,message: `Unique constraint failed on field: ${error.meta.target}`,});
        };
        return res.status(500).send({message: "Internal Server Error",details: error.message,});
    } finally {
        await prisma.$disconnect();
    }
    
};

const handleGetNoteById = async (req,res) =>{
    if(!req.params.id){
        return res.status(400).json({code:400,message:"id is required in params"});
    };

    try{
        const note = await prisma.notes.findFirst({where:{id:req.params.id,userId:req.user.userId,isActive:true}});
        const {userId,...selectedNote} = note;
        if(!note){
            res.status(404).json({code:404,message:"Oops. note not found"});
        }else{
            res.status(200).json({code:200,message:"Success!",data:selectedNote});
        };
    }catch(error){
        return res.status(500).json({code:500,message:"Internal server error"});
    };
};

const handleGetAllNote = async (req,res) =>{
    try{
        const notes = await prisma.notes.findMany({
            where: {
                userId: req.user.userId,
                isActive: true,
            },
            select: {
                id: true,
                title: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                isActive:true
            },
        });
        res.status(200).json({code:200,message:"Success!",data:notes});
    }catch(error){
        return res.status(500).json({code:500,message:"Internal server error"});
    };
};

const handleUpdateNote = async (req,res) =>{
    if(!req.params.id){
        return res.status(400).json({code:400,message:"id is required in params"});
    };

    try{
        const note = await prisma.notes.findFirst({where:{id:req.params.id,userId:req.user.userId,isActive:true}});
        
        if(!note){
            res.status(404).json({code:404,message:"Oops. note not found"});
        }else{
            const updatedNote = await prisma.notes.update({where:{id:req.params.id,userId:req.user.userId,isActive:true},data:{...req.body}});
            const {userId, ...note} = updatedNote;
            res.status(404).json({code:404,message:"Success! note has been updated",data:note});
        };
    }catch(error){
        return res.status(500).json({code:500,message:"Internal server error"});
    };
};

const handleDeleteNote = async (req,res) =>{
    if(!req.params.id){
        return res.status(400).json({code:400,message:"id is required in params"});
    }

    try{
        const note = await prisma.notes.findFirst({where:{id:req.params.id,userId:req.user.userId,isActive:true}});
        if(!note){
            res.status(404).json({code:404,message:"Oops. note note found"});
        }else{
            const note = await prisma.notes.update({where:{id:req.params.id,userId:req.user.userId,isActive:true},data:{isActive:false}});
            res.status(404).json({code:404,message:"Success! note has been deleted"});
        };
    }catch(error){
        return res.status(500).json({code:500,message:"Internal server error"});
    };
};

module.exports = {handleCreateNote,handleGetNoteById,handleGetAllNote,handleUpdateNote,handleDeleteNote};