import { createContext,
   useContext,
   useEffect,
  useMemo,
  useState } from "react";
import  * as anchor from "@project-serum/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import {getAvatarUrl} from 'src/functions/getAvatarUrl'
import {getRandomName} from 'src/functions/getRandomName'
import idl from 'src/idl.json';
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { PublicKey, SystemProgram } from "@solana/web3.js";

const BlogContext = createContext();



// get program key
const PROGRAM_KEY = new PublicKey(idl.metadata.address)


export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error("Parent must be wrapped inside PostsProvider");
  }

  return context;
};

export const BlogProvider = ({ children }) => {

  const [user ,setUser] = useState({})
  const [initialized , setInitialized] = useState(false)
  const [transactionPending, setTransactionPending] = useState(false)

  // const user ={
  //   name :"Dog",
  //   avatar: "https://api.dicebear.com/5.x/adventurer/svg?seed=dog" 

  // }
  const anchorWallet = useAnchorWallet()
  const {connection} = useConnection();
  const {publicKey} = useWallet();
  const program = useMemo(()=> {
    if(anchorWallet){
      const provider = new anchor.AnchorProvider(connection,anchorWallet, anchor.AnchorProvider.defaultOptions);
      return new anchor.Program(idl, PROGRAM_KEY,provider)

    }
  }, [connection, anchorWallet])

  console.log(anchorWallet)
  // console.log(publicKey.toString())
  // console.log(program.account, "Program Here")

  useEffect(() => {
    const start = async () => {
      if(program && publicKey){
        try{
          //check if there is a user account
          setTransactionPending(true)
          const [userPda] = await findProgramAddressSync([utf8.encode('user'),publicKey.toBuffer()], program.programId)
          const user = await program.account.userAccount.fetch(userPda);
          if(user) {
            setInitialized(true) // show create post
          }
        }catch(err){
          console.log("There is no user")
          setInitialized(false) // show initialize users
        } finally {
          setTransactionPending(false)
        }
      }
    }

    start()
  },[program,publicKey,transactionPending])

  const initUser = async () => {
    if (program && publicKey) {
      try {
        setTransactionPending(true)
        const [userPda] = findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
        const name = getRandomName();
        const avatar = getAvatarUrl(name);

        await program.methods
          .initUser(name, avatar)
          .accounts({
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        setInitialized(true)
      } catch (error) {
        console.log(error)
      } finally {
        setTransactionPending(false)
      }
    }
  }

  return (
    <BlogContext.Provider
      value={{
        user,
        initialized,
        transactionPending,

        initUser,
      }}
    >
      {children}
    </BlogContext.Provider>
  );
};
