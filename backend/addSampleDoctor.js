// Script to add 15 sample doctors to the database
// Run this file: node backend/addSampleDoctor.js

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import doctorModel from './models/doctorModel.js';

// Load environment variables
dotenv.config();

// Doctor images served from frontend /public/images/
const doctorImages = Array.from({ length: 15 }, (_, i) => `/images/doc${i + 1}.png`);

// Sample doctors data (each assigned their own photo doc1–doc15)
const sampleDoctors = [
    { name: 'Dr. Sarah Johnson',   email: 'dr.sarah@docslot.com',      speciality: 'General physician',  degree: 'MBBS, MD',                  experience: '8 Years',  fees: 500,  image: doctorImages[0],  about: 'Dr. Sarah Johnson specializes in preventive medicine and chronic disease management. Expert in treating common ailments and providing comprehensive primary care.' },
    { name: 'Dr. Priya Sharma',    email: 'dr.priya@docslot.com',       speciality: 'Gynecologist',       degree: 'MBBS, MS (OBG)',            experience: '12 Years', fees: 800,  image: doctorImages[1],  about: 'Dr. Priya Sharma is a highly experienced gynecologist specializing in women\'s health, prenatal care, and reproductive medicine.' },
    { name: 'Dr. Rajesh Kumar',    email: 'dr.rajesh@docslot.com',      speciality: 'Dermatologist',      degree: 'MBBS, MD (Dermatology)',    experience: '10 Years', fees: 700,  image: doctorImages[2],  about: 'Dr. Rajesh Kumar specializes in treating skin conditions, cosmetic dermatology, and advanced laser treatments.' },
    { name: 'Dr. Emily Chen',      email: 'dr.emily@docslot.com',       speciality: 'Pediatricians',      degree: 'MBBS, MD (Pediatrics)',     experience: '15 Years', fees: 600,  image: doctorImages[3],  about: 'Dr. Emily Chen is dedicated to providing exceptional care for children from infancy through adolescence. Specializes in childhood development and immunizations.' },
    { name: 'Dr. Amit Patel',      email: 'dr.amit@docslot.com',        speciality: 'Neurologist',        degree: 'MBBS, DM (Neurology)',      experience: '14 Years', fees: 1000, image: doctorImages[4],  about: 'Dr. Amit Patel is an expert neurologist treating conditions like migraines, epilepsy, stroke, and neurodegenerative diseases.' },
    { name: 'Dr. Lisa Anderson',   email: 'dr.lisa@docslot.com',        speciality: 'Gastroenterologist', degree: 'MBBS, MD, DM (Gastro)',     experience: '11 Years', fees: 900,  image: doctorImages[5],  about: 'Dr. Lisa Anderson specializes in digestive system disorders, liver diseases, and endoscopic procedures.' },
    { name: 'Dr. Michael Brown',   email: 'dr.michael@docslot.com',     speciality: 'General physician',  degree: 'MBBS, MD',                  experience: '6 Years',  fees: 450,  image: doctorImages[6],  about: 'Dr. Michael Brown provides comprehensive primary care services with focus on patient education and wellness.' },
    { name: 'Dr. Ananya Reddy',    email: 'dr.ananya@docslot.com',      speciality: 'Dermatologist',      degree: 'MBBS, MD (Dermatology)',    experience: '9 Years',  fees: 750,  image: doctorImages[7],  about: 'Dr. Ananya Reddy specializes in acne treatment, anti-aging procedures, and skin cancer screening.' },
    { name: 'Dr. David Wilson',    email: 'dr.david@docslot.com',       speciality: 'Pediatricians',      degree: 'MBBS, MD (Pediatrics)',     experience: '7 Years',  fees: 550,  image: doctorImages[8],  about: 'Dr. David Wilson focuses on preventive pediatric care, childhood nutrition, and developmental assessments.' },
    { name: 'Dr. Kavita Desai',    email: 'dr.kavita@docslot.com',      speciality: 'Gynecologist',       degree: 'MBBS, MS (OBG)',            experience: '13 Years', fees: 850,  image: doctorImages[9],  about: 'Dr. Kavita Desai specializes in high-risk pregnancies, minimally invasive surgeries, and fertility treatments.' },
    { name: 'Dr. Robert Taylor',   email: 'dr.robert@docslot.com',      speciality: 'Neurologist',        degree: 'MBBS, MD, DM (Neurology)', experience: '16 Years', fees: 1100, image: doctorImages[10], about: 'Dr. Robert Taylor is renowned for treating complex neurological disorders, movement disorders, and performing nerve studies.' },
    { name: 'Dr. Sneha Gupta',     email: 'dr.sneha@docslot.com',       speciality: 'Gastroenterologist', degree: 'MBBS, MD, DM (Gastro)',     experience: '10 Years', fees: 950,  image: doctorImages[11], about: 'Dr. Sneha Gupta specializes in inflammatory bowel disease, irritable bowel syndrome, and advanced endoscopy.' },
    { name: 'Dr. James Martinez',  email: 'dr.james@docslot.com',       speciality: 'General physician',  degree: 'MBBS, MD',                  experience: '5 Years',  fees: 400,  image: doctorImages[12], about: 'Dr. James Martinez provides holistic primary care with emphasis on lifestyle medicine and preventive health.' },
    { name: 'Dr. Meera Iyer',      email: 'dr.meera@docslot.com',       speciality: 'Pediatricians',      degree: 'MBBS, MD (Pediatrics)',     experience: '12 Years', fees: 650,  image: doctorImages[13], about: 'Dr. Meera Iyer specializes in pediatric allergies, asthma management, and neonatal care.' },
    { name: 'Dr. Christopher Lee', email: 'dr.christopher@docslot.com', speciality: 'Dermatologist',      degree: 'MBBS, MD (Dermatology)',    experience: '8 Years',  fees: 700,  image: doctorImages[14], about: 'Dr. Christopher Lee focuses on medical dermatology, psoriasis treatment, and hair restoration procedures.' },
];
const addSampleDoctors = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database Connected');

        // Hash password (same for all sample doctors)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('doctor123', salt);

        let addedCount = 0;
        let skippedCount = 0;

        console.log('\n🏥 Adding Sample Doctors...\n');

        for (const doctorData of sampleDoctors) {
            // Check if doctor already exists
            const existingDoctor = await doctorModel.findOne({ email: doctorData.email });

            if (existingDoctor) {
                console.log(`⚠️  Skipped: ${doctorData.name} (already exists)`);
                skippedCount++;
                continue;
            }

            // Create doctor
            const newDoctor = new doctorModel({
                name: doctorData.name,
                email: doctorData.email,
                password: hashedPassword,
                image: doctorData.image,
                speciality: doctorData.speciality,
                degree: doctorData.degree,
                experience: doctorData.experience,
                about: doctorData.about,
                available: true,
                fees: doctorData.fees,
                address: {
                    line1: '123 Medical Center',
                    line2: 'Downtown, Mumbai'
                },
                date: Date.now(),
                slots_booked: {}
            });

            await newDoctor.save();
            console.log(`✅ Added: ${doctorData.name} - ${doctorData.speciality} (₹${doctorData.fees})`);
            addedCount++;
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Summary:');
        console.log(`   ✅ Doctors Added: ${addedCount}`);
        console.log(`   ⚠️  Skipped (Already Exist): ${skippedCount}`);
        console.log(`   📧 Login Password for all: doctor123`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('👨‍⚕️ Specialities Added:');
        const specialities = [...new Set(sampleDoctors.map(d => d.speciality))];
        specialities.forEach(spec => {
            const count = sampleDoctors.filter(d => d.speciality === spec).length;
            console.log(`   • ${spec}: ${count} doctors`);
        });
        console.log('\n');

        // Close connection
        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error adding sample doctors:', error.message);
        mongoose.connection.close();
    }
};

// Run the function
addSampleDoctors();
