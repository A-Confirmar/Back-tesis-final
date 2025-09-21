import {Router} from "express"
import {pool} from "../db.js"



const router = Router();

router.get("/ping", async (req,res)=>{
   try{
      const [rows] = await pool.query("SELECT * from Usuario")
      res.json({Usuario: rows})
   }catch{
      return res.status(500).json({message: "Something goes wrong"})
   }
} )

export default router;