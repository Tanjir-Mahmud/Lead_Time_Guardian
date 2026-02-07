export const KNOWLEDGE_BASE = {
    "logistics_knowledge_base": {
        "highway_corridors": {
            "Dhaka_Chattogram_N1": {
                "chokepoints": ["Meghna Bridge", "Daudkandi", "Sitakunda"],
                "historical_delay": "3-6 hours",
                "seasonal_impact": "Heavy monsoon flooding risk in Feni/Comilla segments",
                "peak_traffic": "05:00 PM - 09:00 PM (Factory Shift Ends)"
            },
            "Dhaka_North_Bengal_N5": {
                "chokepoints": ["Elenga", "Bangabandhu Bridge", "Sirajganj"],
                "historical_delay": "4-10 hours",
                "risk_factors": "Truck congestion at bridge entry, winter fog (Dec-Jan)",
                "ferry_fallback": "Paturia-Daulatdia (Potential 12-24h delay)"
            },
            "Dhaka_Sylhet_N2": {
                "chokepoints": ["Bhulta", "Narsingdi Bazaar", "Sherpur Bridge"],
                "historical_delay": "2-4 hours",
                "risk_factors": "Narrow roads, local market congestion"
            }
        },
        "port_dwell_times": {
            "Chattogram_Port": {
                "vessel_berthing_delay": "3-5 days (if congestion > 70%)",
                "icd_clearance": "24-48 hours",
                "feeder_miss_risk": "High (adds 7-10 days to lead-time)"
            },
            "Benapole_Land_Port": {
                "border_dwell_time": "3-7 days",
                "bottlenecks": "Customs server downtime, manual unloading delays"
            },
            "Mongla_Port": {
                "winter_fog_delay": "12-24 hours (Pashur River navigation)",
                "advantage": "Lower congestion vs CTG"
            }
        },
        "seasonal_buffers": {
            "Monsoon_Jun_Aug": "Add 15% Lead-Time Buffer for rain-related road damage",
            "Winter_Dec_Jan": "Add 10% Lead-Time Buffer for river and highway fog",
            "Ramadan_Eid": "Add 25% Lead-Time Buffer for labor shortage and transport crisis"
        },
        "regulatory_audit_rules": {
            "FOB_Calculation": "Assessable Value = (FOB * 1.01 Insurance * 1.01 Freight)",
            "LDC_Graduation_2026": {
                "EU_UK_Risk": "11.9% MFN Duty",
                "CBAM_Risk": "Carbon tax on industrial exports (Iron, Steel, Cement)"
            },
            "Incentives": "Cash Assistance (4% - 8%) depending on HS Code & destination"
        }
    }
};
