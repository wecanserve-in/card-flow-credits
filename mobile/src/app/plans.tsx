
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "@/components/BottomNav";
import { PLANS } from "../constants/plans";

export default function PlansScreen() {
  const [billing, setBilling] = useState<"monthly"|"yearly">("monthly");
  const [selected, setSelected] = useState("starter");

  const visiblePlans = PLANS.filter(p =>
    p.id === "free" ||
    (billing === "monthly" && p.interval === "Month") ||
    (billing === "yearly" && p.interval === "Year")
  );

  return (
    <SafeAreaView style={styles.container}>
     <ScrollView
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 180,
  }}
>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Select the perfect plan for you</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.tab,billing==="monthly"&&styles.activeTab]}
            onPress={()=>setBilling("monthly")}>
            <Text style={[styles.tabText,billing==="monthly"&&styles.activeTabText]}>Monthly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab,billing==="yearly"&&styles.activeTab]}
            onPress={()=>setBilling("yearly")}>
            <Text style={[styles.tabText,billing==="yearly"&&styles.activeTabText]}>
              Yearly (Save 20%)
            </Text>
          </TouchableOpacity>
        </View>

        {visiblePlans.map(plan=>{
          const selectedCard = selected===plan.id;
          return(
            <TouchableOpacity
              key={plan.id}
              style={[styles.card,selectedCard&&styles.selected]}
              onPress={()=>setSelected(plan.id)}
              activeOpacity={0.9}
            >
              <View style={styles.row}>
                <View style={{flex:1}}>
                  <Text style={styles.plan}>{plan.name}</Text>
                  <Text style={styles.price}>
                    {plan.price===0?"Free":`₹${plan.price}`}
                    {plan.price!==0&&<Text style={styles.month}> /month</Text>}
                  </Text>
                </View>

                <View style={{alignItems:"flex-end"}}>
                  <Text style={styles.scan}>{plan.scans} {plan.id==="free"?"Lifetime":"Scans"}</Text>
                  <Ionicons
                    name={selectedCard?"checkmark-circle":"ellipse-outline"}
                    size={24}
                    color={selectedCard?"#5B4BFF":"#CBD5E1"}
                  />
                </View>
              </View>

              <View style={{marginTop:14}}>
                {plan.features.map(f=>(
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E"/>
                    <Text style={styles.feature}>{f}</Text>
                  </View>
                ))}
              </View>

              {plan.popular && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Most Popular</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}

       
      </ScrollView>
      <View style={styles.bottomCTA}>
  <TouchableOpacity style={styles.button}>
    <Text style={styles.buttonText}>
      {selected === "free" ? "Current Plan" : "Continue"}
    </Text>
  </TouchableOpacity>
</View>

<BottomNav active="plans" />

      <BottomNav active="plans"/>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({

  bottomCTA: {
  position: "absolute",
  left: 20,
  right: 20,
  bottom: 92, // sits just above BottomNav
  backgroundColor: "transparent",
},
container:{flex:1,backgroundColor:"#F5F7FF"},
title:{fontSize:30,fontWeight:"900",color:"#111",paddingHorizontal:20,paddingTop:10},
subtitle:{paddingHorizontal:20,color:"#6B7280",marginTop:6,marginBottom:20},
toggle:{marginHorizontal:20,backgroundColor:"#ECEBFF",borderRadius:18,padding:5,flexDirection:"row"},
tab:{flex:1,height:46,justifyContent:"center",alignItems:"center",borderRadius:14},
activeTab:{backgroundColor:"#5B4BFF"},
tabText:{fontWeight:"700",color:"#5B4BFF"},
activeTabText:{color:"#fff"},
card:{marginHorizontal:20,marginTop:18,backgroundColor:"#fff",borderRadius:22,padding:18,borderWidth:1,borderColor:"#ECECEC"},
selected:{borderColor:"#5B4BFF",borderWidth:2},
row:{flexDirection:"row"},
plan:{fontSize:18,fontWeight:"800",color:"#111"},
price:{marginTop:8,fontSize:30,fontWeight:"900"},
month:{fontSize:14,color:"#6B7280"},
scan:{fontWeight:"800",color:"#111"},
featureRow:{flexDirection:"row",alignItems:"center",marginTop:8},
feature:{marginLeft:8,color:"#4B5563",fontWeight:"600"},
badge:{position:"absolute",right:16,top:-10,backgroundColor:"#5B4BFF",paddingHorizontal:12,paddingVertical:5,borderRadius:20},
badgeText:{color:"#fff",fontWeight:"700",fontSize:12},
button: {
  height: 58,
  borderRadius: 18,
  backgroundColor: "#5B4BFF",
  justifyContent: "center",
  alignItems: "center",

  shadowColor: "#5B4BFF",
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: {
    width: 0,
    height: 6,
  },
  elevation: 10,
},
buttonText:{color:"#fff",fontSize:18,fontWeight:"800"}
});
