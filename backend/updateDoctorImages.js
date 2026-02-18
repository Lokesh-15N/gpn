// Script to update existing doctors' flower placeholder images to real doc photos
// Run: node updateDoctorImages.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import doctorModel from './models/doctorModel.js';

dotenv.config();

// Map each doctor email → their assigned photo (served from frontend /public/images/)
const imageMap = {
    'dr.sarah@docslot.com':       '/images/doc1.png',
    'dr.priya@docslot.com':       '/images/doc2.png',
    'dr.rajesh@docslot.com':      '/images/doc3.png',
    'dr.emily@docslot.com':       '/images/doc4.png',
    'dr.amit@docslot.com':        '/images/doc5.png',
    'dr.lisa@docslot.com':        '/images/doc6.png',
    'dr.michael@docslot.com':     '/images/doc7.png',
    'dr.ananya@docslot.com':      '/images/doc8.png',
    'dr.david@docslot.com':       '/images/doc9.png',
    'dr.kavita@docslot.com':      '/images/doc10.png',
    'dr.robert@docslot.com':      '/images/doc11.png',
    'dr.sneha@docslot.com':       '/images/doc12.png',
    'dr.james@docslot.com':       '/images/doc13.png',
    'dr.meera@docslot.com':       '/images/doc14.png',
    'dr.christopher@docslot.com': '/images/doc15.png',
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
