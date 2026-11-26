import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Env } from "../../config/env.schema.js";

import {createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";




@Injectable()
export class CryptoService {
    private readonly key: Buffer;
    private readonly pepper: string;

    constructor(config: ConfigService<Env, true>){
        this.key = Buffer.from(config.getOrThrow<string>('ENCRYPTION_KEY', {infer: true}), "hex");
        this.pepper = config.getOrThrow<string>("HASH_PEPPER");
    }

    encrypt(cryptDonner:  string) {

        // genère 12 nombre au hasard(diff a chaque appel)
        const brouillageTexte = randomBytes(12);
        //preppare la machine a chiffrer avec la methode(clé secret + hasard)
        const cipher = createCipheriv("aes-256-gcm", this.key, brouillageTexte); 
        //brouille le texte: update melange, final termine et concat les join
        const encrypted = Buffer.concat([cipher.update(cryptDonner, "utf-8"), cipher.final()]);
        // sert a la detection de la modiffication des données
        const tag = cipher.getAuthTag();
        //Assambleur en 4 morceau separé par ":"
        return ["v1", brouillageTexte.toString("base64"), tag.toString("base64"), encrypted.toString('base64')].join(":");
    }


    decrypt (decoded: string) {

        // Couper le texte reçu en 4 morceaux
        const [version, ivB64, tagB64, dataB64] = decoded.split(":")
        
            // Refuser si la version est mauvaise ou si un morceau manque
        if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
            throw new Error("Format de donnée chiffrée invalide");
        }

        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, "base64");
        const encrypted = Buffer.from(dataB64, "base64");


          // Préparer la machine inverse avec le même algo, la même clé et l'iv retrouvé
        const decipher = createDecipheriv("aes-256-gcm", this.key, iv, {authTagLength: 16});
        //Lui donner le sceau à vérifier
        decipher.setAuthTag(tag)


        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString("utf8")

    }

    hash (plainText: string, usage: "identity" | "payout") : string{


        const norepit = plainText.toUpperCase().replace(/[\s-]/g, "");

        // Refuser un texte vide
        if (!norepit) {
            throw new Error("Valeur vide : impossible de calculer l'empreinte");
        }

        const empruntNum = createHmac("sha256", this.pepper)
        const element = empruntNum.update(`${usage}:${norepit}`);
        const recup = element.digest("hex");

        return recup

    }

}