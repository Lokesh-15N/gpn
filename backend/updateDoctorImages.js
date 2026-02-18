// Script to update existing doctors' flower placeholder images to real doc photos
// Run: node updateDoctorImages.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import doctorModel from './models/doctorModel.js';

dotenv.config();

const BASE_IMAGE_URL = `http://localhost:${process.env.PORT || 4000}/images`;

// Map each doctor email → their assigned photo
const imageMap = {
    'dr.sarah@docslot.com':       `${BASE_IMAGE_URL}/doc1.png`,
    'dr.priya@docslot.com':       `${BASE_IMAGE_URL}/doc2.png`,
    'dr.rajesh@docslot.com':      `${BASE_IMAGE_URL}/doc3.png`,
    'dr.emily@docslot.com':       `${BASE_IMAGE_URL}/doc4.png`,
    'dr.amit@docslot.com':        `${BASE_IMAGE_URL}/doc5.png`,
    'dr.lisa@docslot.com':        `${BASE_IMAGE_URL}/doc6.png`,
    'dr.michael@docslot.com':     `${BASE_IMAGE_URL}/doc7.png`,
    'dr.ananya@docslot.com':      `${BASE_IMAGE_URL}/doc8.png`,
    'dr.david@docslot.com':       `${BASE_IMAGE_URL}/doc9.png`,
    'dr.kavita@docslot.com':      `${BASE_IMAGE_URL}/doc10.png`,
    'dr.robert@docslot.com':      `${BASE_IMAGE_URL}/doc11.png`,
    'dr.sneha@docslot.com':       `${BASE_IMAGE_URL}/doc12.png`,
    'dr.james@docslot.com':       `${BASE_IMAGE_URL}/doc13.png`,
    'dr.meera@docslot.com':       `${BASE_IMAGE_URL}/doc14.png`,
    'dr.christopher@docslot.com': `${BASE_IMAGE_URL}/doc15.png`,
};

const updateImages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database Connected\n');

        let updated = 0;
        let skipped = 0;

        for (const [email, imageUrl] of Object.entries(imageMap)) {
            const result = await doctorModel.updateOne(
                { email },
                { $set: { image: imageUrl } }
            );

            if (result.modifiedCount > 0) {
                console.log(`✅ Updated image: ${email} → doc${Object.keys(imageMap).indexOf(email) + 1}.png`);
                updated++;
            } else if (result.matchedCount > 0) {
                console.log(`⚠️  Already up to date: ${email}`);
                skipped++;
            } else {
                console.log(`❌ Doctor not found: ${email}`);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Done — Updated: ${updated} | Skipped: ${skipped}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        mongoose.connection.close();
    }
};

updateImages();
